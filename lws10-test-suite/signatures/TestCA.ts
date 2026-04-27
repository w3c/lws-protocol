/**
 * `TestCA` — the harness-facing facade.
 *
 * Typical usage in a test suite:
 *
 * ```ts
 * // --- one-time setup (run & commit the output) ---
 * const { block } = await TestCA.generate({
 *   subject: { CN: "LWS Test CA", O: "W3C LWS Test Suite" },
 * });
 * fs.writeFileSync("test-ca.json", JSON.stringify(block, null, 2));
 *
 * // --- every test run ---
 * const ca = await TestCA.load(JSON.parse(fs.readFileSync("test-ca.json", "utf8")));
 *
 * const serverCert = await ca.issue("storage.example");
 * const { cert, key, ca: caPem } = ca.tlsCredentials(serverCert);
 * const server = https.createServer({ cert, key, ca: caPem }, handler);
 *
 * const client = new https.Agent({ ca: caPem });
 * ```
 */

import "reflect-metadata";
import * as x509 from "@peculiar/x509";
import type {
  IssuanceTemplate,
  IssuedCertificate,
  KeyAlgorithm,
  SubjectDN,
  TestCABlock,
  TlsCredentials,
} from "./types.js";
import { deserializeKeyPair, generateKeyPair } from "./keys.js";
import {
  createCACertificate,
  issueFromTemplate,
  parseCACert,
  toTlsCredentials,
} from "./cert.js";

// ---------------------------------------------------------------------------
// Default templates that cover common LWS test scenarios
// ---------------------------------------------------------------------------

const DEFAULT_TEMPLATES: IssuanceTemplate[] = [
  {
    templateId: "storage.example",
    subject: { CN: "storage.example", O: "LWS Test" },
    san: { dns: ["storage.example", "localhost"], ip: ["127.0.0.1", "::1"] },
    extendedKeyUsage: ["serverAuth"],
    validitySeconds: 86_400,
  },
  {
    templateId: "authorization.example",
    subject: { CN: "authorization.example", O: "LWS Test" },
    san: { dns: ["authorization.example", "localhost"], ip: ["127.0.0.1", "::1"] },
    extendedKeyUsage: ["serverAuth"],
    validitySeconds: 86_400,
  },
  {
    templateId: "client.alice",
    subject: { CN: "Alice", O: "LWS Test" },
    san: { uri: ["https://id.example/alice"], email: ["alice@example.com"] },
    extendedKeyUsage: ["clientAuth"],
    validitySeconds: 86_400,
  },
  {
    templateId: "client.bob",
    subject: { CN: "Bob", O: "LWS Test" },
    san: { uri: ["https://id.example/bob"], email: ["bob@example.com"] },
    extendedKeyUsage: ["clientAuth"],
    validitySeconds: 86_400,
  },
];

// ---------------------------------------------------------------------------
// TestCA
// ---------------------------------------------------------------------------

export class TestCA {
  private constructor(
    /** Parsed CA certificate. */
    public readonly caCert: x509.X509Certificate,
    /** Live CA key pair (in-memory CryptoKey, never leaves the process). */
    private readonly caKeyPair: CryptoKeyPair,
    /** The manifest block (safe to serialise and store). */
    public readonly block: TestCABlock
  ) {}

  // -------------------------------------------------------------------------
  // Factory methods
  // -------------------------------------------------------------------------

  /**
   * Generate a brand-new test CA.
   *
   * Call this once during test-suite authoring and commit the resulting
   * `block` into the manifest so that every subsequent run uses the same
   * stable CA certificate.
   */
  static async generate(options: {
    subject?: SubjectDN;
    algorithm?: KeyAlgorithm;
    validityDays?: number;
    extraTemplates?: IssuanceTemplate[];
  } = {}): Promise<{ ca: TestCA; block: TestCABlock }> {
    const algorithm: KeyAlgorithm = options.algorithm ?? {
      name: "ECDSA",
      namedCurve: "P-256",
    };
    const subject: SubjectDN = options.subject ?? {
      CN: "LWS Test CA",
      O: "W3C LWS Test Suite",
    };

    const { keyPair: caKeyPair, serialized: caKeyPairSerialized } =
      await generateKeyPair(algorithm);

    const caCert = await createCACertificate(subject, caKeyPair, algorithm, {
      validityDays: options.validityDays ?? 3650,
    });

    const templates = [
      ...DEFAULT_TEMPLATES,
      ...(options.extraTemplates ?? []),
    ];

    const block: TestCABlock = {
      algorithm,
      caCertPem: caCert.toString("pem"),
      caKeyPair: caKeyPairSerialized,
      templates,
    };

    const ca = new TestCA(caCert, caKeyPair, block);
    return { ca, block };
  }

  /**
   * Load a `TestCA` from a previously generated `TestCABlock`.
   *
   * This is the normal entry-point for test harnesses: read the block from the
   * committed manifest file, call `load`, then issue certificates as needed.
   */
  static async load(block: TestCABlock): Promise<TestCA> {
    const caKeyPair = await deserializeKeyPair(block.caKeyPair);
    const caCert = parseCACert(block.caCertPem);
    return new TestCA(caCert, caKeyPair, block);
  }

  // -------------------------------------------------------------------------
  // Certificate issuance
  // -------------------------------------------------------------------------

  /**
   * Issue a certificate from a named template stored in the manifest block.
   *
   * ```ts
   * const cert = await ca.issue("storage.example");
   * ```
   */
  async issue(templateId: string): Promise<IssuedCertificate>;

  /**
   * Issue a certificate from an inline template (not stored in the manifest).
   *
   * Useful for one-off certificates in a single test that don't belong in the
   * shared template library.
   *
   * ```ts
   * const cert = await ca.issue({
   *   templateId: "ephemeral",
   *   subject: { CN: "ephemeral.test" },
   *   san: { dns: ["ephemeral.test"] },
   * });
   * ```
   */
  async issue(template: IssuanceTemplate): Promise<IssuedCertificate>;

  async issue(arg: string | IssuanceTemplate): Promise<IssuedCertificate> {
    const template =
      typeof arg === "string" ? this.findTemplate(arg) : arg;

    return issueFromTemplate(
      template,
      this.caKeyPair,
      this.caCert,
      this.block.algorithm
    );
  }

  /**
   * Issue all default templates at once.  Handy for suite-level `beforeAll`
   * hooks that pre-warm a certificate pool.
   */
  async issueAll(): Promise<Map<string, IssuedCertificate>> {
    const results = new Map<string, IssuedCertificate>();
    for (const template of this.block.templates) {
      results.set(template.templateId, await this.issue(template));
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // TLS helpers
  // -------------------------------------------------------------------------

  /**
   * Extract the options needed by Node's `https.createServer` / `tls.createServer`.
   *
   * ```ts
   * const creds = ca.tlsCredentials(issued);
   * const server = https.createServer(creds, handler);
   * // For clients: new https.Agent({ ca: creds.ca })
   * ```
   */
  tlsCredentials(issued: IssuedCertificate): TlsCredentials {
    return toTlsCredentials(issued, this.block.caCertPem);
  }

  /**
   * Return a Node `https.Agent` configuration object that trusts only the
   * test CA.  Pass this to `fetch` or `https.request` inside tests.
   *
   * ```ts
   * const agentOpts = ca.clientAgentOptions();
   * const response = await fetch(url, { dispatcher: new Agent(agentOpts) });
   * ```
   */
  clientAgentOptions(): { ca: string; rejectUnauthorized: boolean } {
    return { ca: this.block.caCertPem, rejectUnauthorized: true };
  }

  /** The CA certificate in PEM format (shorthand for `block.caCertPem`). */
  get caCertPem(): string {
    return this.block.caCertPem;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private findTemplate(templateId: string): IssuanceTemplate {
    const t = this.block.templates.find((t) => t.templateId === templateId);
    if (!t) {
      throw new Error(
        `TestCA: no template with id "${templateId}". ` +
          `Available: ${this.block.templates.map((t) => t.templateId).join(", ")}`
      );
    }
    return t;
  }
}
