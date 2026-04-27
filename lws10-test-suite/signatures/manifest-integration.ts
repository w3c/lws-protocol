/**
 * manifest-integration.ts
 *
 * Shows how a test harness reads the `lwst:testCA` block from the LWS test
 * manifest and uses it to bootstrap TLS for every test in a suite.
 *
 * This is the glue layer between the JSON-LD manifest (produced by the test
 * suite authors) and the live infrastructure (HTTPS servers, HTTP clients)
 * that the tests run against.
 *
 * Run with:  npx tsx src/manifest-integration.ts
 */

import "reflect-metadata";
import * as https from "node:https";
import { TestCA } from "./TestCA.js";
import type { TestCABlock, IssuedCertificate, TlsCredentials } from "./types.js";

// ---------------------------------------------------------------------------
// Simulated manifest fragment
// ---------------------------------------------------------------------------
// In a real suite this JSON would be parsed from manifest.jsonld.
// The `lwst:testCA` key holds a `TestCABlock` which is generated once and
// committed.  We generate it inline here so this file is self-contained.

async function buildSampleManifestFragment(): Promise<{
  "lwst:testCA": TestCABlock;
  "mf:entries": Array<{ "@id": string; "lwst:name": string }>;
}> {
  const { block } = await TestCA.generate({
    subject: { CN: "LWS Test CA", O: "W3C LWS Test Suite" },
  });

  return {
    "lwst:testCA": block,
    "mf:entries": [
      { "@id": "#getContainer",      "lwst:name": "getContainer" },
      { "@id": "#createDataResource","lwst:name": "createDataResource" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Harness bootstrap
// ---------------------------------------------------------------------------

/**
 * Everything the test harness exposes to individual tests.
 *
 * Built once in `beforeAll`, torn down in `afterAll`.
 */
interface HarnessContext {
  /** TLS options for `https.createServer`. */
  serverCredentials: Record<string, TlsCredentials>;
  /** Issued cert objects (serial, dates, …). */
  issuedCerts: Map<string, IssuedCertificate>;
  /** CA PEM for client-side trust. */
  caCertPem: string;
  /** Convenience factory: returns an `https.Agent` that trusts the test CA. */
  trustedAgent(): https.Agent;
}

async function bootstrapHarness(caBlock: TestCABlock): Promise<HarnessContext> {
  const ca = await TestCA.load(caBlock);

  // Issue every named template defined in the block.
  const issuedCerts = await ca.issueAll();

  // Pre-build TLS credentials keyed by templateId.
  const serverCredentials: Record<string, TlsCredentials> = {};
  for (const [id, cert] of issuedCerts) {
    serverCredentials[id] = ca.tlsCredentials(cert);
  }

  return {
    serverCredentials,
    issuedCerts,
    caCertPem: ca.caCertPem,
    trustedAgent: () => new https.Agent(ca.clientAgentOptions()),
  };
}

// ---------------------------------------------------------------------------
// Simulated test runner
// ---------------------------------------------------------------------------

interface TestEntry {
  id: string;
  name: string;
  run: (ctx: HarnessContext) => Promise<void>;
}

async function runSuite(
  manifest: { "lwst:testCA": TestCABlock; "mf:entries": Array<{ "@id": string; "lwst:name": string }> },
  tests: TestEntry[]
): Promise<void> {
  console.log("\n─── Harness bootstrap ───");
  const ctx = await bootstrapHarness(manifest["lwst:testCA"]);
  console.log(`✓ CA loaded, ${ctx.issuedCerts.size} certs pre-issued`);
  console.log(`  Issued templates: ${[...ctx.issuedCerts.keys()].join(", ")}`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`\n  Test ${test.id} (${test.name}) … `);
    try {
      await test.run(ctx);
      console.log("✓ PASS");
      passed++;
    } catch (err) {
      console.log(`✗ FAIL\n    ${err}`);
      failed++;
    }
  }

  console.log(`\n─── Results: ${passed} passed, ${failed} failed ───\n`);
}

// ---------------------------------------------------------------------------
// Two concrete (toy) tests that use the harness context
// ---------------------------------------------------------------------------

const TESTS: TestEntry[] = [
  {
    id: "#getContainer",
    name: "getContainer",
    async run(ctx) {
      // Spin up a fake storage server using the pre-issued "storage.example" cert.
      const creds = ctx.serverCredentials["storage.example"];
      if (!creds) throw new Error('No credentials for "storage.example"');

      const server = https.createServer(
        { cert: creds.cert, key: creds.key },
        (_req, res) => {
          res.writeHead(200, {
            "Content-Type": "application/lws+json",
            Link: '</alice/notes/.meta>; rel="linkset"; type="application/linkset+json"',
          });
          res.end(JSON.stringify({ "@type": "Container", items: [] }));
        }
      );

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const { port } = server.address() as { port: number };

      try {
        const response = await new Promise<{ status: number; linkHeader: string | undefined }>(
          (resolve, reject) => {
            const req = https.get(
              `https://127.0.0.1:${port}/alice/notes/`,
              { agent: ctx.trustedAgent() },
              (res) => {
                res.resume();
                resolve({
                  status: res.statusCode ?? 0,
                  linkHeader: res.headers["link"],
                });
              }
            );
            req.on("error", reject);
          }
        );

        if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
        if (!response.linkHeader?.includes('rel="linkset"'))
          throw new Error(`Missing linkset Link header; got: ${response.linkHeader}`);
      } finally {
        await new Promise<void>((r) => server.close(() => r()));
      }
    },
  },

  {
    id: "#createDataResource",
    name: "createDataResource",
    async run(ctx) {
      const creds = ctx.serverCredentials["storage.example"];
      if (!creds) throw new Error('No credentials for "storage.example"');

      const server = https.createServer(
        { cert: creds.cert, key: creds.key },
        (_req, res) => {
          res.writeHead(201, {
            Location: "/alice/notes/shoppinglist.txt",
            Link: [
              '</alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"',
              '</alice/notes/>; rel="up"',
              '<https://www.w3.org/ns/lws#DataResource>; rel="type"',
            ].join(", "),
            "Content-Length": "0",
          });
          res.end();
        }
      );

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const { port } = server.address() as { port: number };

      try {
        const response = await new Promise<{ status: number; location: string | undefined }>(
          (resolve, reject) => {
            const req = https.request(
              {
                hostname: "127.0.0.1",
                port,
                path: "/alice/notes/",
                method: "POST",
                agent: ctx.trustedAgent(),
                headers: {
                  "Content-Type": "text/plain",
                  "Content-Length": "47",
                  Slug: "shoppinglist.txt",
                },
              },
              (res) => {
                res.resume();
                resolve({ status: res.statusCode ?? 0, location: res.headers["location"] });
              }
            );
            req.on("error", reject);
            req.end("milk\neggs\nbread\nbutter\napples\norange juice\n");
          }
        );

        if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
        if (!response.location?.includes("shoppinglist.txt"))
          throw new Error(`Bad Location: ${response.location}`);
      } finally {
        await new Promise<void>((r) => server.close(() => r()));
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  LWS manifest → harness integration demo");
  console.log("══════════════════════════════════════════");

  const manifest = await buildSampleManifestFragment();
  console.log(`\nManifest has ${manifest["mf:entries"].length} test entries`);
  console.log(`testCA block size: ${JSON.stringify(manifest["lwst:testCA"]).length} chars`);

  await runSuite(manifest, TESTS);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
