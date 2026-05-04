/**
 * Types shared across the test-CA implementation.
 *
 * The manifest embeds a `testCA` block that supplies everything a test harness
 * needs to bootstrap a self-contained PKI:
 *
 *   - The CA's serialised key pair (PKCS#8 private key + SPKI public key, both
 *     PEM-encoded so they are copy-pasteable into JSON without escaping).
 *   - The self-signed CA certificate (PEM).
 *   - A set of named `IssuanceTemplate`s that the harness can instantiate into
 *     real leaf certificates on demand.
 *
 * All key material is EC/P-256 by default; RSA-2048 is also supported via the
 * algorithm discriminant.
 */

// ---------------------------------------------------------------------------
// Key material
// ---------------------------------------------------------------------------

/** Algorithm discriminant stored in the manifest. */
export type KeyAlgorithm =
  | { name: "ECDSA"; namedCurve: "P-256" | "P-384" | "P-521" }
  | { name: "RSASSA-PKCS1-v1_5"; modulusLength: 2048 | 4096; hash: "SHA-256" | "SHA-384" }
  | { name: "Ed25519" };

/** A serialised key pair as it appears inside the test manifest. */
export interface SerializedKeyPair {
  /** Algorithm used to generate this key pair. */
  algorithm: KeyAlgorithm;
  /** PKCS#8 DER → base64url (no PEM headers – cleaner inside JSON). */
  privateKeyB64: string;
  /** SubjectPublicKeyInfo DER → base64url. */
  publicKeyB64: string;
}

// ---------------------------------------------------------------------------
// Certificate issuance templates
// ---------------------------------------------------------------------------

/** Subject distinguished name expressed as a flat map of RDN types → values. */
export interface SubjectDN {
  CN: string;
  O?: string;
  OU?: string;
  C?: string;
  ST?: string;
  L?: string;
}

/**
 * A named template that the harness expands into a leaf certificate.
 *
 * Templates are intentionally underspecified: the harness fills in the gaps
 * (serial number, validity window, actual key material) at runtime so every
 * test run gets fresh, non-replayable certs.
 */
export interface IssuanceTemplate {
  /** Human-readable label used to look up the template by tests. */
  templateId: string;

  subject: SubjectDN;

  /**
   * Subject Alternative Names.  At least one of `dns` or `ip` SHOULD be
   * present for server certificates so TLS hostname verification passes.
   */
  san?: {
    dns?: string[];
    ip?: string[];
    uri?: string[];
    email?: string[];
  };

  /**
   * Key algorithm for the *leaf* key pair.  Defaults to the CA algorithm when
   * omitted, which keeps the happy path simple.
   */
  leafAlgorithm?: KeyAlgorithm;

  /**
   * Validity period in seconds from the moment of issuance.
   * Defaults to 86 400 (1 day) – short enough to stay safe in CI, long
   * enough that a slow test suite won't hit clock-skew problems.
   */
  validitySeconds?: number;

  /** Extended Key Usage OIDs.  Defaults to ["serverAuth"]. */
  extendedKeyUsage?: Array<"serverAuth" | "clientAuth" | "emailProtection" | "codeSigning">;

  /**
   * When true the issued cert is marked as a CA (basicConstraints CA:TRUE).
   * Use this to create intermediate CAs for chain-validation tests.
   */
  isCA?: boolean;
}

// ---------------------------------------------------------------------------
// Test-CA manifest block
// ---------------------------------------------------------------------------

/**
 * The `testCA` block that lives inside a LWS test manifest.
 *
 * Example embedding:
 *
 * ```json
 * {
 *   "@context": ["./context.jsonld"],
 *   "lwst:testCA": {
 *     "algorithm": { "name": "ECDSA", "namedCurve": "P-256" },
 *     "caCertPem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
 *     "caKeyPair": { ... },
 *     "templates": [ ... ]
 *   }
 * }
 * ```
 */
export interface TestCABlock {
  /** Algorithm used for the CA key pair (and default for leaf keys). */
  algorithm: KeyAlgorithm;

  /** PEM-encoded self-signed CA certificate. */
  caCertPem: string;

  /** Serialised CA key pair. */
  caKeyPair: SerializedKeyPair;

  /** Named issuance templates that tests can reference. */
  templates: IssuanceTemplate[];
}

// ---------------------------------------------------------------------------
// Runtime types (not stored in the manifest)
// ---------------------------------------------------------------------------

/** A fully-materialised leaf certificate produced by the harness at runtime. */
export interface IssuedCertificate {
  /** PEM certificate chain: leaf first, then CA. */
  certChainPem: string;

  /** PEM-encoded leaf private key (PKCS#8). */
  privateKeyPem: string;

  /** DER buffer of the leaf certificate (handy for TLS options). */
  certDer: ArrayBuffer;

  /** The template that was used. */
  template: IssuanceTemplate;

  /** UTC timestamp when the certificate becomes valid. */
  notBefore: Date;

  /** UTC timestamp when the certificate expires. */
  notAfter: Date;

  /** Hex serial number assigned to this certificate. */
  serialNumber: string;
}

/** Everything a Node `tls.createServer` / `https.createServer` call needs. */
export interface TlsCredentials {
  /** PEM cert chain (leaf + CA). */
  cert: string;
  /** PEM private key for the leaf. */
  key: string;
  /** PEM CA certificate (pass as `ca` to clients so they trust the chain). */
  ca: string;
}
