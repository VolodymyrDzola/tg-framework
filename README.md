# 🚀 Ultra Telegram Framework (UTF)

Сучасний, легкий та повністю типізований фреймворк для створення Telegram-ботів. Побудований з акцентом на швидкість, гнучкість та підтримку найновіших функцій API.

[![Documentation](https://img.shields.io/badge/docs-TypeDoc-blue.svg)](https://твій-нік.github.io/tg-framework/)

## ✨ Особливості

* **🔥 Повна підтримка Bot API 10.0:** Live Photos, Guest Mode, стрімінг AI-відповідей через `sendMessageDraft`.
* **🌍 Мультиплатформенність:** Працює на **Google Apps Script (GAS)**, **Node.js**, **Cloudflare Workers** та в браузері.
* **🛡 Сувора типізація:** Автоматична генерація типів на основі офіційної специфікації.
* **📦 Розумні сесії:** Гібридне сховище для GAS (Cache + Properties) та Memory для Node.
* **🧩 Сцени та Меню:** Вбудований Wizard-менеджер для складних сценаріїв та інтерактивні Inline-меню.

## 🚀 Швидкий старт

### Встановлення

```bash
# Клонуйте репозиторій
git clone https://github.com/VolodymyrDzola/tg-framework.git
cd tg-framework
npm install

```

### Приклад бота (Node.js)

```typescript
import { Bot, WebApiClient } from './src';

const bot = new Bot('YOUR_TOKEN', new WebApiClient('YOUR_TOKEN'));

bot.command('start', async (ctx) => {
  await ctx.reply('Привіт! Я працюю на версії API 10.0 🚀');
});

// Стрімінг відповіді (AI Style)
bot.command('ai', async (ctx) => {
  const draftId = Date.now();
  await ctx.replyWithDraft(draftId, "Зачекайте, я думаю...");
  // ... логіка генерації ...
  await ctx.reply("Ось ваша відповідь!");
});

bot.launch();

```

## 🛠 Архітектура

Проєкт розбитий на модулі для легкого масштабування:

* `/core` — ядро: контекст, композитор, транспортний рівень.
* `/adapters` — специфічні реалізації для різних середовищ (GAS, Web, Node).
* `/scenes` — логіка станів та покрокових діалогів.
* `/session` — системи збереження даних користувачів.

## 🧰 Корисні методи Context (ctx)

Крім стандартних методів API, `Context` містить потужні хелпери:

| Метод | Опис |
|-------|------|
| `ctx.replyWithDraft(id, text)` | Стрімінг тимчасового повідомлення (AI-style). Живе 30 сек. |
| `ctx.replyWithPoll(...)` | Відправка опитувань з підтримкою медіа та пояснень. |
| `ctx.replyWithPaidMedia(...)`| Монетизація: відправка медіа за Telegram Stars ⭐️. |
| `ctx.deleteAllReactions()` | Очищення чату від усіх реакцій користувача. |
| `ctx.scene.enter('name')` | Перехід до іншої сцени (Wizard). |

## 📄 Ліцензія

Цей проєкт поширюється під ліцензією **MIT**. Деталі у файлі [LICENSE](LICENSE).

---

## ☕️ Підтримка розробки

Якщо цей фреймворк допоміг вам швидше запустити бота або ви просто хочете подякувати автору — закидайте «на каву» в банку. Ваша підтримка мотивує мене швидше додавати нові методи Telegram API та розвивати екосистему.

👉 **[Закинути в банку Monobank](https://send.monobank.ua/jar/9WEy6keH3v)**

Дякую за підтримку! ❤️

