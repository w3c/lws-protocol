/**
 * Certificate issuance engine.
 *
 * Uses `@peculiar/x509` for X.509 structure building.  The CA key is provided
 * as a `CryptoKey` already loaded into the Web Crypto API — the engine never
 * touches raw key bytes.
 *
 * Design note: we keep this module's public surface small.  The test harness
 * only ever calls `issueFromTemplate`; everything else is an implementation
 * detail.
 */

import "reflect-metadata";
import { webcrypto } from "node:crypto";
import * as x509 from "@peculiar/x509";

// @peculiar/x509 maintains its own CryptoProvider registry and looks up the
// provider named "default" for every internal operation (key identifier
// generation, signing, etc.).  In a browser that registry is pre-populated
// from window.crypto; in Node we must register explicitly.  Do it here,
// once, before any x509 API is called.
x509.cryptoProvider.set(webcrypto);
import type {
  IssuanceTemplate,
  IssuedCertificate,
  KeyAlgorithm,
  SubjectDN,
  TlsCredentials,
} from "./types.js";
import { derToPem, pemToDer, randomSerial, signingAlgorithm } from "./keys.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const EKU_OIDS: Record<string, string> = {
  serverAuth: "1.3.6.1.5.5.7.3.1",
  clientAuth: "1.3.6.1.5.5.7.3.2",
  emailProtection: "1.3.6.1.5.5.7.3.4",
  codeSigning: "1.3.6.1.5.5.7.3.3",
};

function dnString(dn: SubjectDN): string {
  const parts: string[] = [`CN=${dn.CN}`];
  if (dn.O) parts.push(`O=${dn.O}`);
  if (dn.OU) parts.push(`OU=${dn.OU}`);
  if (dn.C) parts.push(`C=${dn.C}`);
  if (dn.ST) parts.push(`ST=${dn.ST}`);
  if (dn.L) parts.push(`L=${dn.L}`);
  return parts.join(", ");
}

/** Convert our `KeyAlgorithm` discriminant to the object peculiar/x509 expects. */
function toX509Algorithm(alg: KeyAlgorithm): Algorithm {
  switch (alg.name) {
    case "ECDSA":
      return { name: "ECDSA", namedCurve: alg.namedCurve } as Algorithm;
    case "RSASSA-PKCS1-v1_5":
      return {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: alg.modulusLength,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: alg.hash,
      } as Algorithm;
    case "Ed25519":
      return { name: "Ed25519" } as Algorithm;
  }
}

// ---------------------------------------------------------------------------
// Self-signed CA certificate
// ---------------------------------------------------------------------------

/**
 * Create a self-signed CA certificate.  Call this once when setting up a
 * new test suite; store the result in `testCA.caCertPem`.
 */
export async function createCACertificate(
  subject: SubjectDN,
  caKeyPair: CryptoKeyPair,
  algorithm: KeyAlgorithm,
  options: {
    validityDays?: number;
    serialNumber?: string;
  } = {}
): Promise<x509.X509Certificate> {
  const { validityDays = 3650, serialNumber = randomSerial() } = options;

  const notBefore = new Date();
  const notAfter = new Date(notBefore.getTime() + validityDays * 86_400_000);

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber,
    name: dnString(subject),
    notBefore,
    notAfter,
    signingAlgorithm: signingAlgorithm(algorithm) as Algorithm,
    keys: caKeyPair,
    extensions: [
      new x509.BasicConstraintsExtension(true /* isCA */, undefined, true /* critical */),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
        true /* critical */
      ),
      await x509.SubjectKeyIdentifierExtension.create(caKeyPair.publicKey),
    ],
  });

  return cert;
}

// ---------------------------------------------------------------------------
// Leaf certificate issuance
// ---------------------------------------------------------------------------

/**
 * Issue a leaf certificate from an `IssuanceTemplate`.
 *
 * The harness calls this at test-setup time with:
 *   - the parsed `TestCABlock` (contains `caCertPem` + `caKeyPair`)
 *   - the `IssuanceTemplate` it wants to materialise
 *
 * It returns an `IssuedCertificate` whose fields can be fed directly into
 * `tls.createServer`, `https.createServer`, or an `https.Agent`.
 */
export async function issueFromTemplate(
  template: IssuanceTemplate,
  caKeyPair: CryptoKeyPair,
  caCert: x509.X509Certificate,
  caAlgorithm: KeyAlgorithm
): Promise<IssuedCertificate> {
  const validitySeconds = template.validitySeconds ?? 86_400;
  const leafAlgorithm = template.leafAlgorithm ?? caAlgorithm;
  const ekuNames = template.extendedKeyUsage ?? ["serverAuth"];
  const serialNumber = randomSerial();

  const notBefore = new Date();
  const notAfter = new Date(notBefore.getTime() + validitySeconds * 1_000);

  // Generate a fresh leaf key pair
  const leafKeys = await webcrypto.subtle.generateKey(
    toX509Algorithm(leafAlgorithm) as EcKeyGenParams,
    true /* extractable */,
    ["sign", "verify"]
  );

  // Build extensions list
  const extensions: x509.Extension[] = [
    new x509.BasicConstraintsExtension(template.isCA ?? false, undefined, true),
    new x509.KeyUsagesExtension(
      template.isCA
        ? x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.digitalSignature
        : x509.KeyUsageFlags.digitalSignature,
      true
    ),
    new x509.ExtendedKeyUsageExtension(ekuNames.map((n) => EKU_OIDS[n]), false),
    await x509.SubjectKeyIdentifierExtension.create(leafKeys.publicKey),
    await x509.AuthorityKeyIdentifierExtension.create(caCert, false),
  ];

  // Subject Alternative Names
  if (template.san) {
    const generalNames: x509.GeneralName[] = [];
    for (const dns of template.san.dns ?? [])
      generalNames.push(new x509.GeneralName("dns", dns));
    for (const ip of template.san.ip ?? [])
      generalNames.push(new x509.GeneralName("ip", ip));
    for (const uri of template.san.uri ?? [])
      generalNames.push(new x509.GeneralName("url", uri));
    for (const email of template.san.email ?? [])
      generalNames.push(new x509.GeneralName("email", email));

    if (generalNames.length > 0) {
      extensions.push(new x509.SubjectAlternativeNameExtension(generalNames, false));
    }
  }

  const leafCert = await x509.X509CertificateGenerator.create({
    serialNumber,
    subject: dnString(template.subject),
    issuer: caCert.subject,
    notBefore,
    notAfter,
    signingAlgorithm: signingAlgorithm(caAlgorithm) as Algorithm,
    publicKey: leafKeys.publicKey,
    signingKey: caKeyPair.privateKey,
    extensions,
  });

  // Serialise leaf private key to PKCS#8 PEM
  const leafPrivDer = await webcrypto.subtle.exportKey(
    "pkcs8",
    leafKeys.privateKey
  );
  const privateKeyPem = derToPem(leafPrivDer, "PRIVATE KEY");

  // PEM chain: leaf cert first, then CA
  const leafPem = leafCert.toString("pem");
  const caPem = caCert.toString("pem");
  const certChainPem = leafPem + "\n" + caPem;

  return {
    certChainPem,
    privateKeyPem,
    certDer: leafCert.rawData,
    template,
    notBefore,
    notAfter,
    serialNumber,
  };
}

// ---------------------------------------------------------------------------
// Convenience: parse a CA cert PEM back into an x509.X509Certificate
// ---------------------------------------------------------------------------

export function parseCACert(pem: string): x509.X509Certificate {
  return new x509.X509Certificate(pemToDer(pem));
}

// ---------------------------------------------------------------------------
// Convenience: extract TlsCredentials for Node's https/tls modules
// ---------------------------------------------------------------------------

export function toTlsCredentials(
  issued: IssuedCertificate,
  caCertPem: string
): TlsCredentials {
  return {
    cert: issued.certChainPem,
    key: issued.privateKeyPem,
    ca: caCertPem,
  };
}
