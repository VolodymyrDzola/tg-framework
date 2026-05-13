# 🚀 Ultra Telegram Framework (UTF)

[![Bot API 10.0](https://img.shields.io/badge/Bot%20API-10.0-blue.svg?logo=telegram)](https://core.telegram.org/bots/api)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-powered-orange.svg?logo=google-apps-script)](https://developers.google.com/apps-script/)
[![Documentation](https://img.shields.io/badge/docs-TypeDoc-blue.svg?logo=readthedocs)](https://volodymyrdzola.github.io/ultra-tg-framework/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Interactive Demo](https://img.shields.io/badge/Play_with-Architecture-blueviolet?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI%2BPHBhdGggZD0iTTEyIDguOTk5OTRMNC4wNjM4NiAxNC4xNTg0QzMuMzc2MDEgMTQuNjA1NSAzLjAzMjA5IDE0LjgyOTEgMi45MTI5NyAxNS4xMTI2QzIuODA4ODggMTUuMzYwMyAyLjgwODg4IDE1LjYzOTYgMi45MTI5NyAxNS44ODczTTEyIDguOTk5OTRMMTkuOTM2MSAxNC4xNTg0QzIwLjYyNCAxNC42MDU1IDIwLjk2NzkgMTQuODI5MSAyMS4wODcgMTUuMTEyNkMyMS4xOTExIDE1LjM2MDMgMjEuMTkxMSAxNS42Mzk2IDIxLjA4NyAxNS44ODczTTEyIDguOTk5OTRWMi40OTk5NE0xMiAxNC45OTk5TDQuMDYzODYgOS44NDE0NUMzLjM3NjAxIDkuMzk0MzUgMy4wMzIwOSA5LjE3MDggMi45MTI5NyA4Ljg4NzNDMi44MDg4OCA4LjYzOTU1IDIuODA4ODggOC4zNjAzMyAyLjkxMjk3IDguMTEyNThNMTIgMTQuOTk5OUwxOS45MzYxIDkuODQxNDVDMjAuNjI0IDkuMzk0MzUgMjAuOTY3OSA5LjE3MDggMjEuMDg3IDguODg3M0MyMS4xOTExIDguNjM5NTUgMjEuMTkxMSA4LjM2MDMzIDIxLjA4NyA4LjExMjU4TTEyIDE0Ljk5OTlWMjEuNDk5OU0yMS4yNzIgMTUuOTczMkwxMi44NzIgMjEuNDMzMkMxMi41NTY0IDIxLjYzODMgMTIuMzk4NSAyMS43NDA5IDEyLjIyODUgMjEuNzgwOEMxMi4wNzgyIDIxLjgxNjEgMTEuOTIxOCAyMS44MTYxIDExLjc3MTUgMjEuNzgwOEMxMS42MDE1IDIxLjc0MDkgMTEuNDQzNiAyMS42MzgzIDExLjEyOCAyMS40MzMyTDIuNzI4MDIgMTUuOTczMkMyLjQ2MjAxIDE1LjgwMDIgMi4zMjkwMSAxNS43MTM4IDIuMjMyNjUgMTUuNTk4NUMyLjE0NzM1IDE1LjQ5NjQgMi4wODMyNyAxNS4zNzgzIDIuMDQ0MTcgMTUuMjUxMkMyIDE1LjEwNzUgMiAxNC45NDg5IDIgMTQuNjMxNlY5LjM2ODI0QzIgOS4wNTA5OCAyIDguODkyMzUgMi4wNDQxNyA4Ljc0ODcxQzIuMDgzMjcgOC42MjE1NSAyLjE0NzM1IDguNTAzNDggMi4yMzI2NSA4LjQwMTRDMi4zMjkwMSA4LjI4NjA4IDIuNDYyMDEgOC4xOTk2MyAyLjcyODAyIDguMDI2NzNMMTEuMTI4IDIuNTY2NzNDMTEuNDQzNiAyLjM2MTU3IDExLjYwMTUgMi4yNTkgMTEuNzcxNSAyLjIxOTA5QzExLjkyMTggMi4xODM4MSAxMi4wNzgyIDIuMTgzODEgMTIuMjI4NSAyLjIxOTA5QzEyLjM5ODUgMi4yNTkgMTIuNTU2NCAyLjM2MTU3IDEyLjg3MiAyLjU2NjczTDIxLjI3MiA4LjAyNjczQzIxLjUzOCA4LjE5OTYzIDIxLjY3MSA4LjI4NjA4IDIxLjc2NzQgOC40MDE0QzIxLjg1MjcgOC41MDM0OCAyMS45MTY3IDguNjIxNTUgMjEuOTU1OCA4Ljc0ODcxQzIyIDguODkyMzUgMjIgOS4wNTA5OCAyMiA5LjM2ODI0VjE0LjYzMTZDMjIgMTQuOTQ4OSAyMiAxNS4xMDc1IDIxLjk1NTggMTUuMjUxMkMyMS45MTY3IDE1LjM3ODMgMjEuODUyNyAxNS40OTY0IDIxLjc2NzQgMTUuNTk4NUMyMS42NzEgMTUuNzEzOCAyMS41MzggMTUuODAwMiAyMS4yNzIgMTUuOTczMloiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8%2BPC9zdmc%2B)](https://codepen.io/volodymyrdzola/pen/ZYBppWo)

**Ultra Telegram Framework (UTF)** is a modern, lightweight, and strongly typed Telegram Bot API framework built for **TypeScript**.

Designed with flexibility in mind, UTF features a unique **adapter-based architecture** that allows your bot to run seamlessly across various environments — from classic Node.js servers to Serverless Edge functions and Google Apps Script — without rewriting your core logic.

---

## ✨ Highlights

- 🌍 **Write Once, Run Anywhere**: Deploy to Node.js, Cloudflare Workers, Vercel Edge, Bun, or Google Apps Script just by swapping the API client.
- 🎭 **Batteries Included**: Sessions, Wizard Scenes, and Declarative Inline Menus are built directly into the core. No external plugins needed.
- 🤖 **AI-Ready**: Built-in streaming support (`ctx.replyWithDraft()`) with auto-debouncing for LLM integrations.
- 🛡️ **100% Type-Safe**: Exhaustive TypeScript coverage for the entire Telegram Bot API 10.0. Rich IDE autocompletion out of the box.
- ☁️ **Zero-Config GAS**: Automatically bundle and deploy to Google Apps Script with our built-in `utf-build` CLI tool. No manual webhook boilerplate needed.

---

## 📦 Installation

```bash
npm install ultra-tg-framework
```

---

## 🏁 Quick Start (Hello World)

Here is a basic example using the Node.js adapter with long polling. The syntax is designed to be instantly familiar if you have used other popular frameworks.

```typescript
import { TelegramBot, NodeApiClient } from 'ultra-tg-framework';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is missing!');

// 1. Initialize with the Node adapter
const bot = new TelegramBot(new NodeApiClient(token));

// 2. Setup handlers
bot.command('start', async (ctx) => {
  await ctx.reply('Hello! I am an Ultra Telegram Framework bot 🚀');
});

bot.on('text', async (ctx) => {
  // 100% type-safe: ctx.text is guaranteed to exist here
  await ctx.reply(`You said: ${ctx.text}`);
});

// 3. Launch
bot.launch().then(() => console.log('🚀 Bot is running...'));
```

### Example 2: Google Apps Script

Write your bot logic once and deploy to GAS without any boilerplate.

```typescript
import { TelegramBot, GasApiClient } from 'ultra-tg-framework';

// GasApiClient automatically finds your BOT_TOKEN in Script Properties!
const bot = new TelegramBot(new GasApiClient());

bot.command('start', (ctx) => ctx.reply('Hello from GAS! ☁️'));
```

Build and deploy with one command:
```bash
npx utf-build src/index.ts
clasp push
```

---

## 📚 Documentation & Guides

**[👉 Read the Full Documentation in our Wiki](https://github.com/VolodymyrDzola/ultra-tg-framework/wiki)**

To keep this README clean, all detailed guides, tutorials, and advanced concepts are documented in our GitHub Wiki. There you will find:

* 🚀 **[Migrating to UTF](https://github.com/VolodymyrDzola/ultra-tg-framework/wiki/Migrating-to-UTF)**: A quick cheatsheet for users migrating from Telegraf or grammY.
* ☁️ **Deployment Guides**: Copy-paste examples for **[Google Apps Script](https://github.com/VolodymyrDzola/ultra-tg-framework/wiki/Deploy-to-GAS)** and **[Edge Environments (Cloudflare)](https://github.com/VolodymyrDzola/ultra-tg-framework/wiki/Edge-Computing)**.
* 🧠 **Deep Dives**: Learn how to use **[Wizard Scenes](https://github.com/VolodymyrDzola/ultra-tg-framework/wiki/Wizard-Scenes)**, page-based **[Inline Menus](https://github.com/VolodymyrDzola/ultra-tg-framework/wiki/Inline-Menus)**, and different **[Session Storages](https://github.com/VolodymyrDzola/ultra-tg-framework/wiki/Session)**.
* 🔗 **[TypeDoc API Reference](https://volodymyrdzola.github.io/ultra-tg-framework/)**: Auto-generated technical specs for all classes and methods.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](https://github.com/VolodymyrDzola/ultra-tg-framework?tab=MIT-1-ov-file) file for details.

## ☕️ Support the Project

If this framework helped you save time, bypass GAS limitations, or build something awesome, consider supporting its development!

💳 **[Support the project (Monobank)](https://send.monobank.ua/jar/9WEy6keH3v)**