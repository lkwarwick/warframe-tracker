#!/usr/bin/env bash
set -e
TMP=$(mktemp -d)
git clone --filter=blob:none --no-checkout --depth 1 https://github.com/wfcd/warframe-items.git "$TMP"
cd "$TMP"
git sparse-checkout init --cone
git sparse-checkout set data/json
git checkout
cd - > /dev/null
rm -rf vendor/warframe-items/data/json
mkdir -p vendor/warframe-items/data/json
cp -r "$TMP"/data/json/* vendor/warframe-items/data/json/
cp "$TMP"/index.d.ts vendor/warframe-items/index.d.ts
rm -rf "$TMP"
echo "vendor/warframe-items updated"