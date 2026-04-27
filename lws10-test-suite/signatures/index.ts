export type {
  IssuanceTemplate,
  IssuedCertificate,
  KeyAlgorithm,
  SerializedKeyPair,
  SubjectDN,
  TestCABlock,
  TlsCredentials,
} from "./types.js";

export { TestCA } from "./TestCA.js";

// Lower-level exports for advanced harnesses that need to drive issuance
// directly rather than through the TestCA facade.
export { generateKeyPair, deserializeKeyPair, derToPem, pemToDer } from "./keys.js";
export { createCACertificate, issueFromTemplate, parseCACert, toTlsCredentials } from "./cert.js";
