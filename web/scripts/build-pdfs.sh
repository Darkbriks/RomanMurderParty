#!/usr/bin/env bash
# Build the novel twice (final and brouillon) for the reader site.
# Usage: web/scripts/build-pdfs.sh [OUT_DIR]   (default: build/web)
# Each mode gets its own output directory, because \include writes
# parties/*.aux under the output directory and the modes must not share them.
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="${1:-build/web}"

for mode in final brouillon; do
  mkdir -p "$OUT/$mode"
  # \MPmode overrides the package option; \includeonly is neutralised so
  # that a leftover line in roman.tex cannot truncate the PDF.
  latexmk -outdir="$OUT/$mode" -interaction=nonstopmode -halt-on-error \
    -usepretex="\\def\\MPmode{$mode}\\renewcommand{\\includeonly}[1]{}" roman.tex
  [ -f "$OUT/$mode/roman.mpmap" ] || { echo "missing roman.mpmap in $OUT/$mode" >&2; exit 1; }
done
