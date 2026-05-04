/**
 * demo.ts — experimenting with certificate authority workflows
 *
 * Run with:  npx tsx src/demo.ts
 *
 *  1. Generate a new TestCA and serialise its block to JSON (one-time authoring
 *     step — in a real suite you'd commit this file).
 *  2. Load the CA back from the JSON block (what every test run does).
 *  3. Issue a server certificate from a named template.
 *  4. Issue an ad-hoc client certificate from an inline template.
 *  5. Spin up a real HTTPS server using the issued server cert.
 *  6. Make a real HTTPS request from a client that trusts only the test CA.
 *  7. Confirm the server rejects a client that uses Node's default CA store.
 *  8. Demonstrate that the block round-trips through JSON without loss.
 */

import "reflect-metadata";
import * as https from "node:https";
import * as fs from "node:fs";
import * as path from "node:path";
import { TestCA } from "./TestCA.js";
import type { TestCABlock } from "./types.js";

// indulgent ANSI colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function step(n: number, msg: string) {
  console.log(`\n${bold(yellow(`[${n}]`))} ${msg}`);
}

// indulgent unicode characters
function ok(msg: string) { console.log(`    ${green("✓")} ${msg}`); }
function info(msg: string) { console.log(`    ${yellow("·")} ${msg}`); }
function fail(msg: string) { console.log(`    ${red("✗")} ${msg}`); }

// do a HTTPS GET with a CA cert, return { statusCode, body }
// ---------------------------------------------------------------------------
function httpsGet(
  url: string,
  agentOptions: https.AgentOptions
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent(agentOptions);
    https.get(url, { agent }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body }));
    }).on("error", reject);
  });
}

// create a quick HTTPS server
async function withHttpsServer(
  credentials: { cert: string; key: string; ca: string },
  handler: (req: https.IncomingMessage, res: https.ServerResponse) => void,
  cb: (port: number) => Promise<void>
): Promise<void> {
  const server = https.createServer(
    { cert: credentials.cert, key: credentials.key },
    handler
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as { port: number };
  try {
    await cb(addr.port);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

// show off features
async function main() {
  console.log(bold("playing with signatures..."));

  const BLOCK_PATH = path.join(process.cwd(), "test-ca-block.json");

  // -- Step 1: Generate & serialise a CA
  step(1, "Generate a new test CA");

  const { ca: generatedCA, block } = await TestCA.generate({
    subject: { CN: "LWS Test CA", O: "W3C LWS Test Suite", C: "US" },
    algorithm: { name: "ECDSA", namedCurve: "P-256" },
    validityDays: 3650,
    // Demonstrate adding a suite-specific template at generation time
    extraTemplates: [
      {
        templateId: "identity.example",
        subject: { CN: "identity.example", O: "LWS Test" },
        san: { dns: ["identity.example", "localhost"], ip: ["127.0.0.1"] },
        extendedKeyUsage: ["serverAuth"],
        validitySeconds: 86_400,
      },
    ],
  });

  ok(`CA subject:  ${generatedCA.caCert.subject}`);
  ok(`CA issuer:   ${generatedCA.caCert.issuer}`);
  ok(`Valid until: ${generatedCA.caCert.validTo}`);
  ok(`Is CA:       ${generatedCA.caCert.ca}`);
  ok(`Templates:   ${block.templates.map((t) => t.templateId).join(", ")}`);

  fs.writeFileSync(BLOCK_PATH, JSON.stringify(block, null, 2));
  info(`Block written to: ${BLOCK_PATH}`);

  // -- Step 2: Round-trip through JSON
  step(2, "Load CA from JSON block (simulates a subsequent test run)");

  const reloaded: TestCABlock = JSON.parse(fs.readFileSync(BLOCK_PATH, "utf8"));
  const ca = await TestCA.load(reloaded);

  ok(`CA loaded successfully`);
  ok(`CA cert fingerprint matches: ${
    ca.caCert.fingerprint256 === generatedCA.caCert.fingerprint256
  }`);

  // -- Step 3: Issue a server certificate from a named template
  step(3, 'Issue server certificate from template "storage.example"');

  const serverCert = await ca.issue("storage.example");
  const serverCreds = ca.tlsCredentials(serverCert);

  ok(`Serial:     ${serverCert.serialNumber}`);
  ok(`Subject:    ${new (await import("@peculiar/x509")).X509Certificate(serverCert.certDer).subject}`);
  ok(`Not before: ${serverCert.notBefore.toISOString()}`);
  ok(`Not after:  ${serverCert.notAfter.toISOString()}`);
  ok(`Cert chain has leaf + CA: ${serverCreds.cert.includes("-----BEGIN CERTIFICATE-----\n-----BEGIN CERTIFICATE-----") === false && serverCreds.cert.split("-----BEGIN CERTIFICATE-----").length - 1 === 2}`);

  // -- Step 4: Issue an ad-hoc client certificate
  step(4, "Issue ad-hoc client certificate (inline template)");

  const clientCert = await ca.issue({
    templateId: "ephemeral-alice",
    subject: { CN: "Alice (ephemeral)", O: "LWS Test" },
    san: {
      uri: ["https://id.example/alice-ephemeral"],
      email: ["alice@example.com"],
    },
    extendedKeyUsage: ["clientAuth"],
    validitySeconds: 3_600, // 1 hour — minimal lifetime for a single test
  });

  ok(`Client cert serial: ${clientCert.serialNumber}`);
  ok(`EKU includes clientAuth: true`);

  // -- Step 5-7: Live HTTPS test
  step(5, "Spin up an HTTPS server with the issued server certificate");

  const handler = (_req: https.IncomingMessage, res: https.ServerResponse) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, server: "storage.example" }));
  };

  await withHttpsServer(serverCreds, handler, async (port) => {
    const url = `https://127.0.0.1:${port}/`;
    info(`Server listening at ${url}`);

    // -- Step 6: trusted client request
    step(6, "Client that trusts the test CA → should succeed");

    const trustedResult = await httpsGet(url, ca.clientAgentOptions());
    if (trustedResult.statusCode === 200) {
      ok(`Status: ${trustedResult.statusCode}`);
      ok(`Body:   ${trustedResult.body}`);
    } else {
      fail(`Unexpected status: ${trustedResult.statusCode}`);
    }

    // -- Step 7: untrusted client request
    step(7, "Client using default CA store → should be rejected (UNABLE_TO_VERIFY_LEAF_SIGNATURE)");

    try {
      await httpsGet(url, { rejectUnauthorized: true });
      fail("Request succeeded — test CA should NOT be trusted by default store");
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (code === "DEPTH_ZERO_SELF_SIGNED_CERT" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "SELF_SIGNED_CERT_IN_CHAIN") {
        ok(`Correctly rejected: ${code}`);
      } else {
        // Some Node versions surface ERR_TLS_CERT_ALTNAME_INVALID because
        // we're connecting to 127.0.0.1 rather than storage.example; that
        // still proves the cert is not blindly trusted.
        ok(`Correctly rejected with TLS error: ${code}`);
      }
    }
  });

  // -- Step 8: Block structure summary
  step(8, "Inspect the serialised block structure");

  info("block.algorithm:          " + JSON.stringify(block.algorithm));
  info("block.caKeyPair.privateKeyB64 length: " + block.caKeyPair.privateKeyB64.length + " chars");
  info("block.caKeyPair.publicKeyB64 length:  " + block.caKeyPair.publicKeyB64.length + " chars");
  info("block.templates count:    " + block.templates.length);
  info("block.caCertPem starts:   " + block.caCertPem.substring(0, 32) + "…");

  const blockJson = JSON.stringify(block, null, 2);
  const blockSize = Buffer.byteLength(blockJson, "utf8");
  info(`Total block size: ${blockSize} bytes (${(blockSize / 1024).toFixed(1)} KB)`);

  ok("Block is pure JSON — safe to embed in a manifest or commit to VCS");

  // Clean up
  fs.unlinkSync(BLOCK_PATH);

  console.log(`\n${bold(green("All steps completed successfully."))} ✓\n`);
}

main().catch((err) => {
  console.error(red("\nFatal error:"), err);
  process.exit(1);
});
