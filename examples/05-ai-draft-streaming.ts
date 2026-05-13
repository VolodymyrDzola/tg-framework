import { TelegramBot, sessionManager, WebApiClient, MemoryStorage, InlineMenu, InlineKeyboard, SceneContext } from '../src/index';

const bot = new TelegramBot(new WebApiClient('TOKEN'));

// Mock function to simulate a slow AI API call (e.g., OpenAI)
const simulateSlowAI = () => new Promise(resolve => setTimeout(resolve, 5000));

bot.command('ask', async (ctx) => {
  const query = ctx.text?.replace('/ask', '').trim();

  if (!query) {
    return ctx.reply("Please provide a question. Example: /ask What is the capital of France?");
  }

  // Generate a unique ID for this specific draft session
  const draftId = Date.now().toString();

  try {
    // 1. Start showing the draft typing animation (expires after 30s by default)
    if (!ctx.chatId) {
      return;
    }

    await ctx.replyWithDraft(Number(draftId), {
      chat_id: ctx.chatId,
      text: "🧠 Generating response..."
    });

    // 2. Perform the actual slow task (fetch from OpenAI, database query, etc.)
    await simulateSlowAI();
    const finalAnswer = `Here is the AI response to: "${query}"\n\nIt is fascinating how this works!`;

    // 3. Send the final answer (this automatically replaces the draft message)
    await ctx.reply(finalAnswer);

  } catch (error) {
    // Clean up if something fails
    await ctx.reply("Sorry, the AI model is currently unavailable.");
  }
});

bot.launch().then(() => console.log('AI Draft example running!'));