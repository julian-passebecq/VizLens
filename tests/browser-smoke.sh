#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp)"
ERR="$(mktemp)"
TMPROOT="$(mktemp -d)"
trap 'rm -f "$OUT" "$ERR"; rm -rf "$TMPROOT"' EXIT
URL="file://$ROOT/tests/browser-harness.html"

CHROME_BIN="${CHROME_BIN:-}"
if [ -z "$CHROME_BIN" ]; then
  for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
    if command -v "$candidate" >/dev/null 2>&1; then CHROME_BIN="$(command -v "$candidate")"; break; fi
  done
fi
if [ -z "$CHROME_BIN" ]; then
  echo "No Chromium/Chrome executable found. Set CHROME_BIN to run the browser smoke." >&2
  exit 2
fi

mkdir -p "$TMPROOT/home" "$TMPROOT/config" "$TMPROOT/cache" "$TMPROOT/runtime"
export HOME="$TMPROOT/home"
export XDG_CONFIG_HOME="$TMPROOT/config"
export XDG_CACHE_HOME="$TMPROOT/cache"
export XDG_RUNTIME_DIR="$TMPROOT/runtime"

set +e
timeout 20s "$CHROME_BIN" --headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu --user-data-dir="$TMPROOT/profile" --allow-file-access-from-files --virtual-time-budget=1500 --dump-dom "$URL" > "$OUT" 2> "$ERR"
STATUS=$?
set -e
if [ "$STATUS" -ne 0 ]; then
  if [ "$STATUS" -eq 124 ]; then echo "Chromium smoke timed out before the harness could finish. This usually means the current runtime cannot launch headless Chrome; use npm run test:e2e on a normal desktop Chrome installation." >&2; tail -40 "$ERR" >&2 || true; exit 2; fi
  echo "Chromium smoke harness could not start/finish (exit $STATUS)." >&2; tail -40 "$ERR" >&2 || true; exit "$STATUS"
fi
node - "$OUT" <<'NODE'
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
if (!html.includes('data-done="true"')) throw new Error('Browser harness did not finish.');
const match = html.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!match) throw new Error('Scanner output was not rendered.');
const text = match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const data = JSON.parse(text);
if (data.version !== '0.13') throw new Error(`Unexpected scan version ${data.version}`);
if (data.summary.visualCount < 1) throw new Error('No visual detected.');
if (data.summary.dataBoundVisualCount < 1) throw new Error('D3-style bound data was not detected.');
if (data.summary.iframeCount < 1) throw new Error('Analytical iframe/embed was not detected.');
const iframe = data.visuals.find((v) => v.kind === 'iframe');
if (!iframe?.lazySource || iframe.sourceAttribute !== 'data-src') throw new Error('Lazy iframe source was not recovered from data-src.');
if (!data.summary.primaryVisualId) throw new Error('Primary visual was not ranked.');
if (!data.article?.headline?.includes('Quarterly revenue')) throw new Error('Article snapshot was not extracted.');
const visual = data.visuals.find((v) => v.id === data.summary.primaryVisualId);
if (!visual || visual.boundMarkCount !== 4) throw new Error('Primary visual does not contain expected bound marks.');
const mapping = visual.groups.flatMap((g) => g.mappings || []).find((m) => m.data === 'value' && m.attr === 'width');
if (!mapping || mapping.r2 < 0.99) throw new Error('Expected value->width mapping was not recovered.');
console.log('VizLens browser smoke passed: article snapshot, primary ranking, D3 bound data and mapping recovery.');
NODE
