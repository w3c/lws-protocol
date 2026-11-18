# Diagrams

The figures in this folder are generated from `../lws10-core.c4`, a
[LikeC4](https://likec4.dev) model of the specification's architecture. Do not
edit the `.svg` files directly — edit the `.c4` source and regenerate.

None of the tooling below should be installed inside this repository. Everything
is run from a separate folder on your own machine; only the resulting `.svg`
files ever get committed here.

## Prerequisites

- [Node.js](https://nodejs.org) (for `npx`/`npm`)
- [Graphviz](https://graphviz.org) — provides the `dot` command
  ```bash
  brew install graphviz        # macOS
  apt-get install graphviz     # Debian/Ubuntu
  ```

No headless browser is required for this workflow — `dot` output goes straight
to real vector SVG.

## 1. Install LikeC4 (outside this repo)

Set up a scratch folder somewhere outside the repo, e.g. under your home
directory, and install LikeC4 there:

```bash
mkdir -p ~/tools/likec4-tooling && cd ~/tools/likec4-tooling
npm init -y
npm install likec4
```

You only need to do this once. Run every command below from inside
`~/tools/likec4-tooling`.

## 2. Generate `.dot` files from the model
Your `lws-protocol` repo is at `/path/to/`
```
export DOTPATH=/path/to/lws-protocol
```

And we need to delete the index.dot because we don't need it.
```bash
npx likec4 gen dot $DOTPATH/lws10-core/diagrams
rm $DOTPATH/lws10-core/diagrams/index.dot
```

This reads `lws10-core.c4` and writes one `.dot` file per view into `diagrams/`,
named after the view id (e.g. `fig-container-diagram.dot`). These files carry the
model's actual layout parameters and theme color.

## 3. Render `.dot` → `.svg`

```bash
cd $DOTPATH
for f in *.dot; do
  dot -Tsvg "$f" -o "./$(basename "${f%.dot}").svg"
done
```

This writes the SVGs directly into this `diagrams/` folder.
