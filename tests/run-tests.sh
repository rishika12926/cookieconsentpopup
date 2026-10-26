#!/usr/bin/env bash
# Runs the fast unit tests, then the end-to-end suite in real Chromium.
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
node "$DIR/unit.test.js"
node "$DIR/api.test.js"
node "$DIR/translator.test.js"
node "$DIR/e2e.js" "$@"
