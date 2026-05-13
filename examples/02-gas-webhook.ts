/**
 * Google Apps Script Example
 * 
 * To deploy this bot to GAS:
 * 1. Install the framework: npm install ultra-telegram-framework
 * 2. Run the build command: npx utf-build examples/02-gas-webhook.ts
 * 3. Push to GAS: clasp push
 */

import { TelegramBot, GasApiClient, sessionManager, GasHybridStorage, Context } from '../src/index';

interface MyContext extends Context {
  session: {
    calls: number;
  };
}

// With GasApiClient, token is fetched automatically from PropertiesService!
const bot = new TelegramBot<MyContext>(new GasApiClient());

// ALWAYS use GasHybridStorage on Google Apps Script to prevent data loss
bot.use(sessionManager({
  storage: new GasHybridStorage(),
  initial: () => ({ calls: 0 })
}));

bot.command('start', async (ctx) => {
  await ctx.reply('Hello from Google Apps Script! 🚀');
});

bot.command('stats', async (ctx) => {
  // session is guaranteed to exist because of the middleware above
  ctx.session.calls = (ctx.session.calls || 0) + 1;
  await ctx.reply(`You have called this command ${ctx.session.calls} times.`);
});