import { build } from 'esbuild';
import { existsSync, copyFileSync } from 'fs';

// Ніяких імпортів бота, ніякого async/await. Тільки сирий, синхронний GAS.
const autoEntryCode = `
import { bot } from './src/index';

globalThis.doPost = async (e) => {
  try {
    if (!e || !e.postData || !e.postData.contents) return;
    const update = JSON.parse(e.postData.contents);
  
    // Вся магія ініціалізації контексту тепер всередині бота!
    await bot.handleUpdate(update);
  } catch (err) {
    console.error("Critical Webhook Error: " + err);
  }
};
`;

build({
  stdin: {
    contents: autoEntryCode,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'iife',
  footer: {
    js: 'function doPost(e) { return globalThis.doPost(e); }'
  },
}).then(() => {
  if (existsSync('src/appsscript.json')) {
    copyFileSync('src/appsscript.json', 'dist/appsscript.json');
  }
  console.log('✅ Бандл створено!');
}).catch(() => process.exit(1));