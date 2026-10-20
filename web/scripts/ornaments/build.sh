#!/usr/bin/env bash
# Render the pgfornament ornaments of murderparty.sty to SVG for the reader site.
# Usage: web/scripts/ornaments/build.sh   (writes web/site/static/ornaments/*.svg)
# Needs lualatex (with pgfornament) and pdftocairo (poppler). The SVGs are committed,
# so this only runs again when the ornaments change.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../../site/static/ornaments"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

lualatex -interaction=nonstopmode -halt-on-error -output-directory="$TMP" "$HERE/ornaments.tex" >/dev/null

mkdir -p "$OUT"
page=1
for name in partie chapitre scene fin; do
  pdftocairo -svg -f "$page" -l "$page" "$TMP/ornaments.pdf" "$TMP/$name.svg"
  # Ink follows the theme: every colour becomes currentColor. The drawing is wrapped in
  # <g id="ornament"> so the site can reference it with <use href="…/name.svg#ornament">.
  sed -E \
    -e 's/(fill|stroke)="(rgb\([^)]*\)|#[0-9a-fA-F]{3,6}|black)"/\1="currentColor"/g' \
    -e 's#(<svg [^>]*>)#\1<g id="ornament">#' \
    -e 's#</svg>#</g></svg>#' \
    "$TMP/$name.svg" >"$OUT/$name.svg"
  if grep -Eq '(fill|stroke)="(rgb|#)' "$OUT/$name.svg"; then
    echo "$name.svg: a colour was not replaced by currentColor" >&2
    exit 1
  fi
  echo "$name.svg: $(grep -o 'viewBox="[^"]*"' "$OUT/$name.svg")"
  page=$((page + 1))
done

# Favicon (served under the base path, see app.html): the scene ornament in sepia, centred in a
# square, lighter when the system is dark. Colours are the paper and dark accents of themes.ts.
read -r w h < <(sed -nE 's/.*viewBox="0 0 ([0-9.]+) ([0-9.]+)".*/\1 \2/p' "$OUT/scene.svg" | head -n 1)
side="$(awk -v w="$w" -v h="$h" 'BEGIN { print (w > h ? w : h) }')"
dy="$(awk -v s="$side" -v h="$h" 'BEGIN { printf "%.3f", (h - s) / 2 }')"
dx="$(awk -v s="$side" -v w="$w" 'BEGIN { printf "%.3f", (w - s) / 2 }')"
sed -E \
  -e "s#<svg [^>]*>#<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"$dx $dy $side $side\"><style>svg{color:\#6B4A2B}@media (prefers-color-scheme:dark){svg{color:\#D1A870}}</style>#" \
  -e 's#<g id="ornament">#<g>#' \
  "$OUT/scene.svg" >"$OUT/../favicon.svg"
echo "favicon.svg: viewBox $dx $dy $side $side"
