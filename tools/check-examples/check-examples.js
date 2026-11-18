// Checks that every tabbed example set in the specs shows the same RDF in
// each tab. A tab set is a <div class="example-tabs"> whose children are
// <div data-tab="label"> panes; the last fenced code block in each pane is
// taken as that pane's body (a pane may also show a request and headers).
// Relative IRIs resolve against the request URL shown in the pane, or else
// against the set's data-base attribute.
// application/lws+json and application/ld+json bodies are read as JSON-LD.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import jsonld from "jsonld";
import { Parser } from "n3";
import { isomorphic } from "rdf-isomorphic";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const contextPath = resolve(
  process.argv[2] ?? join(root, "lws10-vocab/vocabulary.context.jsonld"),
);
const LWS_CONTEXT = "https://www.w3.org/ns/lws/v1";
const DEFAULT_BASE = "https://storage.example/";

if (!existsSync(contextPath)) {
  console.error(
    `JSON-LD context not found at ${contextPath}.\n` +
      "Build it first: (cd lws10-vocab && npm ci && npx yml2vocab -v vocabulary -t template.html -c)",
  );
  process.exit(2);
}
const lwsContext = JSON.parse(readFileSync(contextPath, "utf8"));

// The LWS context is not necessarily published yet, so serve it from the
// vocabulary build and refuse any other remote context.
async function documentLoader(url) {
  if (url === LWS_CONTEXT) {
    return { contextUrl: null, documentUrl: url, document: lwsContext };
  }
  throw new Error(`Unexpected remote context ${url}`);
}

function syntaxOf(label) {
  const l = label.toLowerCase();
  if (l.includes("lws+json") || l.includes("ld+json") || l.includes("json-ld")) return "jsonld";
  if (l.includes("n-triples")) return "N-Triples";
  if (l.includes("n-quads")) return "N-Quads";
  if (l.includes("trig")) return "TriG";
  if (l.includes("turtle")) return "Turtle";
  return null;
}

async function parse(syntax, text, base) {
  if (syntax === "jsonld") {
    const nquads = await jsonld.toRDF(JSON.parse(text), {
      base,
      documentLoader,
      format: "application/n-quads",
      safe: true,
    });
    return new Parser({ format: "N-Quads" }).parse(nquads);
  }
  return new Parser({ format: syntax, baseIRI: base }).parse(text);
}

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.(md|html)$/.test(entry.name)) yield path;
  }
}

// Returns the text between <div class="example-tabs"> and its closing </div>,
// tracking nested divs.
function* tabSets(source) {
  const open = /<div class="example-tabs"(?: data-base="([^"]*)")?>/g;
  let m;
  while ((m = open.exec(source))) {
    const tags = /<div\b[^>]*>|<\/div>/g;
    tags.lastIndex = m.index + m[0].length;
    let depth = 1;
    let t;
    while (depth && (t = tags.exec(source))) depth += t[0].startsWith("</") ? -1 : 1;
    if (depth) throw new Error("Unclosed example-tabs block");
    const line = source.slice(0, m.index).split("\n").length;
    yield { line, base: m[1] ?? DEFAULT_BASE, body: source.slice(m.index + m[0].length, t.index) };
  }
}

function panes(body, base) {
  const result = [];
  const re = /<div data-tab="([^"]+)">([\s\S]*?)(?=<div data-tab="|$)/g;
  let m;
  while ((m = re.exec(body))) {
    const blocks = [...m[2].matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((b) => b[1]);
    const request = blocks.map((b) => /^[A-Z]+ (\S+) HTTP\//.exec(b)).find(Boolean);
    result.push({
      label: m[1],
      text: blocks.at(-1),
      base: request ? new URL(request[1], base).href : base,
    });
  }
  return result;
}

// Triples of a that b lacks, as N-Triples-like lines. Blank node labels
// differ between parsers, so this is a hint for the reader, not the test.
function difference(a, b) {
  const show = (q) => `${q.subject.value} ${q.predicate.value} ${q.object.value}` +
    (q.object.termType === "Literal" ? ` (${q.object.datatype.value}${q.object.language ? " @" + q.object.language : ""})` : "");
  const other = new Set(b.map(show));
  return a.map(show).filter((line) => !other.has(line));
}

let failures = 0;
let checked = 0;
for (const file of files(root)) {
  const source = readFileSync(file, "utf8");
  if (!source.includes('<div class="example-tabs"')) continue;
  for (const set of tabSets(source)) {
    const where = `${relative(root, file)}:${set.line}`;
    const graphs = [];
    for (const pane of panes(set.body, set.base)) {
      const syntax = syntaxOf(pane.label);
      if (!syntax) {
        console.error(`✗ ${where}: tab "${pane.label}" is not a known RDF syntax`);
        failures++;
        continue;
      }
      if (pane.text === undefined) {
        console.error(`✗ ${where}: tab "${pane.label}" has no code block`);
        failures++;
        continue;
      }
      try {
        graphs.push({ ...pane, quads: await parse(syntax, pane.text, pane.base) });
      } catch (err) {
        console.error(`✗ ${where}: tab "${pane.label}" does not parse: ${err.message}`);
        failures++;
      }
    }
    const [first, ...rest] = graphs;
    let ok = graphs.length === panes(set.body, set.base).length;
    for (const other of rest) {
      if (isomorphic(first.quads, other.quads)) continue;
      ok = false;
      failures++;
      console.error(
        `✗ ${where}: "${other.label}" (${other.quads.length} triples) is not ` +
          `isomorphic to "${first.label}" (${first.quads.length} triples)`,
      );
      for (const line of difference(first.quads, other.quads)) console.error(`    only in ${first.label}: ${line}`);
      for (const line of difference(other.quads, first.quads)) console.error(`    only in ${other.label}: ${line}`);
    }
    if (first && ok) {
      checked++;
      console.log(`✓ ${where}: ${graphs.map((g) => g.label).join(", ")} (${first.quads.length} triples)`);
    }
  }
}

if (!checked && !failures) console.log("No tabbed examples found.");
process.exit(failures ? 1 : 0);
