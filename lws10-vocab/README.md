# LWS Vocabulary

This directory contains the source definition for the **Linked Web Storage (LWS) Vocabulary**.

## Files

### Source files (edit these)
- `vocabulary.yml` — Main vocabulary definition
- `template.html` — HTML template for documentation

### Generated files (do not edit directly)
- `index.html` — Human-readable HTML documentation
- `vocabulary.ttl` — RDF/Turtle serialization
- `vocabulary.jsonld` — Full JSON-LD serialization
- `vocabulary.context.jsonld` — JSON-LD Context file

## How to regenerate locally

```bash
cd lws10-vocab
npx yml2vocab
