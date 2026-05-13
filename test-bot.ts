import { TelegramBot, GasApiClient } from './src/index';
const bot = new TelegramBot(new GasApiClient());
bot.command('test', (ctx) => ctx.reply('Work!'));
