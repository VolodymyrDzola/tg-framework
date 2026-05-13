#!/usr/bin/env node
import { build } from 'esbuild';
import { resolve, join, dirname } from 'path';
import { existsSync, copyFileSync } from 'fs';

const entryFile = process.argv[2];

if (!entryFile) {
  console.error("❌ Usage: utf-build <entry-file.ts>");
  process.exit(1);
}

const resolvedEntry = resolve(process.cwd(), entryFile).replace(/\\/g, '/');

if (!existsSync(resolvedEntry)) {
  console.error(`❌ Entry file not found: ${resolvedEntry}`);
  process.exit(1);
}

const wrapperCode = `
import { _activeBotInstance, GasApiClient } from 'ultra-telegram-framework';

// 1. Execute the developer's code. This will instantiate TelegramBot 
// and assign it to _activeBotInstance.
import '${resolvedEntry}';

// 2. Define the GAS webhook entry point
globalThis.doPost = async (e) => {
  if (!_activeBotInstance) {
      console.error("Error: You must create an instance of TelegramBot in your entry file!");
      return;
  }
  
  try {
    if (!e || !e.postData || !e.postData.contents) return;
    const update = JSON.parse(e.postData.contents);
    _activeBotInstance._setClient(new GasApiClient()); 
    await _activeBotInstance.handleUpdate(update);
  } catch (err) {
    console.error("Critical Webhook Error: " + err);
  }
};
`;

build({
  stdin: { contents: wrapperCode, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'iife',
  footer: { js: 'function doPost(e) { return globalThis.doPost(e); }' }
}).then(() => {
  // Copy GAS manifest if it exists in the same folder as the entry file
  const appsscriptPath = join(dirname(resolvedEntry), 'appsscript.json');
  if (existsSync(appsscriptPath)) {
    copyFileSync(appsscriptPath, join(process.cwd(), 'dist', 'appsscript.json'));
    console.log('📄 appsscript.json copied.');
  } else if (existsSync(join(process.cwd(), 'src', 'appsscript.json'))) {
    copyFileSync(join(process.cwd(), 'src', 'appsscript.json'), join(process.cwd(), 'dist', 'appsscript.json'));
    console.log('📄 appsscript.json copied.');
  }

  console.log('🎨 Build successful! dist/bundle.js is ready for clasp push.');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
