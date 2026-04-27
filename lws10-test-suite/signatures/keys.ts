/**
 * Key generation and serialisation helpers.
 *
 * All crypto is performed through the Web Crypto API.  We import `webcrypto`
 * explicitly from `node:crypto` rather than relying on `globalThis.crypto` so
 * the module works on Node 18 and under tsx, which may not wire up the global
 * before module evaluation.
 */

import { webcrypto } from "node:crypto";
import type { KeyAlgorithm, SerializedKeyPair } from "./types.js";

// Single, reliable handle on SubtleCrypto — used everywhere in this module.
const subtle = webcrypto.subtle;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map our discriminant to the `SubtleCrypto.generateKey` algorithm parameter. */
function toSubtleAlgorithm(
  alg: KeyAlgorithm
): EcKeyGenParams | RsaHashedKeyGenParams | { name: string } {
  switch (alg.name) {
    case "ECDSA":
      return { name: "ECDSA", namedCurve: alg.namedCurve };
    case "RSASSA-PKCS1-v1_5":
      return {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: alg.modulusLength,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: alg.hash,
      };
    case "Ed25519":
      return { name: "Ed25519" };
  }
}

/** Return the hash algorithm to use with the key algorithm when signing. */
export function signingAlgorithm(
  alg: KeyAlgorithm
): AlgorithmIdentifier | EcdsaParams | RsaPssParams {
  switch (alg.name) {
    case "ECDSA":
      return { name: "ECDSA", hash: { name: "SHA-256" } };
    case "RSASSA-PKCS1-v1_5":
      return { name: "RSASSA-PKCS1-v1_5" };
    case "Ed25519":
      return { name: "Ed25519" };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate a fresh key pair and serialise it for storage in a manifest. */
export async function generateKeyPair(
  algorithm: KeyAlgorithm
): Promise<{ keyPair: CryptoKeyPair; serialized: SerializedKeyPair }> {
  const keyPair = await subtle.generateKey(
    toSubtleAlgorithm(algorithm) as KeyAlgorithm,
    true /* extractable */,
    ["sign", "verify"]
  );

  const privateKeyDer = await subtle.exportKey("pkcs8", keyPair.privateKey);
  const publicKeyDer = await subtle.exportKey("spki", keyPair.publicKey);

  const serialized: SerializedKeyPair = {
    algorithm,
    privateKeyB64: bufferToBase64url(privateKeyDer),
    publicKeyB64: bufferToBase64url(publicKeyDer),
  };

  return { keyPair, serialized };
}

/**
 * Reconstruct a `CryptoKeyPair` from a serialised manifest block.
 *
 * Call this inside the test harness when you need to actually sign
 * certificates — you do not need to re-generate the keys every run.
 */
export async function deserializeKeyPair(
  serialized: SerializedKeyPair
): Promise<CryptoKeyPair> {
  const alg = toSubtleAlgorithm(serialized.algorithm);
  const sigAlg = signingAlgorithm(serialized.algorithm);

  const privateKey = await subtle.importKey(
    "pkcs8",
    base64urlToBuffer(serialized.privateKeyB64),
    alg,
    true,
    ["sign"]
  );

  const publicKey = await subtle.importKey(
    "spki",
    base64urlToBuffer(serialized.publicKeyB64),
    alg,
    true,
    ["verify"]
  );

  // Suppress unused-variable warning – sigAlg is consumed by the caller.
  void sigAlg;

  return { privateKey, publicKey };
}

// ---------------------------------------------------------------------------
// PEM ↔ DER utilities (public so callers can use them with external DER blobs)
// ---------------------------------------------------------------------------

export function bufferToBase64url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64url");
}

export function base64urlToBuffer(b64url: string): ArrayBuffer {
  const buf = Buffer.from(b64url, "base64url");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Convert raw DER bytes to a PEM string with the given label. */
export function derToPem(der: ArrayBuffer, label: string): string {
  const b64 = Buffer.from(der).toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/** Strip PEM headers and decode to DER. */
export function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s/g, "");
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Encode an 8-byte random serial as a hex string (RFC 5280 §4.1.2.2). */
export function randomSerial(): string {
  const bytes = new Uint8Array(8);
  webcrypto.getRandomValues(bytes);
  // Clear the high bit to keep the integer positive in DER encoding.
  bytes[0] &= 0x7f;
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
