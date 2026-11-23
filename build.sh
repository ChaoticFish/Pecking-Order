#!/usr/bin/env bash
# Builds the install zip and a source zip into dist/:
#   <element>-v<version>.zip          install through System → Install → Extensions
#   <element>-v<version>-source.zip   everything in this repository (keep it with the release)
# The version comes from the manifest; CHANGELOG.md must have a "## <version>" entry.
# demo/ (the demo page and its files), docs/ (manuals) and tests/ go in the source zip only.
# Checks: PHP syntax, and no outside addresses (http/https) in shipped JS or CSS.
set -euo pipefail
cd "$(dirname "$0")"
MANIFEST=$(grep -l '<extension' ./*.xml | head -1)
ELEMENT=$(basename "$MANIFEST" .xml)
case "$ELEMENT" in pkg_*|mod_*|plg_*|com_*|tpl_*|lib_*) ;; *) ELEMENT=$(sed -n 's:.*<element>\(.*\)</element>.*:\1:p' "$MANIFEST" | head -1); ELEMENT=${ELEMENT:-$(basename "$MANIFEST" .xml)};; esac
VERSION=$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' "$MANIFEST" | head -1)
fail() { echo "BUILD STOPPED: $*" >&2; exit 1; }
echo "$ELEMENT $VERSION"
grep -q "^## $VERSION\b" CHANGELOG.md || fail "CHANGELOG.md has no \"## $VERSION\" entry"
if command -v php >/dev/null; then find . -name '*.php' -not -path './.git/*' -not -path './dist/*' -print0 | xargs -0 -r -n1 php -l > /dev/null; fi
if grep -RInE 'https?://[A-Za-z0-9-]+\.[A-Za-z]{2,}' --include='*.js' --include='*.css' . --exclude-dir=.git --exclude-dir=dist | grep -vE 'www\.w3\.org/(2000/svg|1999/xlink)'; then
  fail "an outside address in shipped JavaScript or CSS"
fi
mkdir -p dist
OUT="dist/$ELEMENT-v$VERSION.zip"
rm -f "$OUT" "dist/$ELEMENT-v$VERSION-source.zip"
zip -qrX "$OUT" . -x '.git/*' -x '.gitignore' -x 'dist/*' -x 'build.sh' -x 'tests/*' -x 'demo/*' -x 'docs/*' -x '*.DS_Store'
zip -qrX "dist/$ELEMENT-v$VERSION-source.zip" . -x '.git/*' -x 'dist/*' -x '*.DS_Store'
(cd dist && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256")
echo "Built $OUT"; cat "$OUT.sha256"
