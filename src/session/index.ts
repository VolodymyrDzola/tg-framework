// src/session/index.ts
import { Context } from '../core/context';
import { Middleware } from '../core/composer';
import { Storage } from './storage';
import { MemoryStorage } from './memory-storage';

export interface SessionOptions<S, C extends Context> {
  /** Сховище даних (за замовчуванням MemoryStorage) */
  storage?: Storage<S>;

  /** Функція генерації ключа (за замовчуванням "chatId:userId") */
  getSessionKey?: (ctx: C) => string | undefined;

  /** Функція ініціалізації порожньої сесії (якщо даних ще немає) */
  initial?: () => S;
}

/**
 * Мідлвар для додавання сесій у контекст.
 */
export function session<S, C extends Context & { session?: S }>(
  options?: SessionOptions<S, C>
): Middleware<C> {
  const storage = options?.storage || new MemoryStorage<S>();

  const getSessionKey = options?.getSessionKey || ((ctx: C) => {
    const chatId = ctx.chatId;
    const fromId = ctx.from?.id;
    if (chatId == null || fromId == null) {
      return undefined; // Якщо це подія без чату/користувача, сесія не працюватиме
    }
    return `${chatId}:${fromId}`;
  });

  return async (ctx, next) => {
    const key = getSessionKey(ctx);

    // Якщо ключ не згенеровано (наприклад, системний апдейт), просто йдемо далі
    if (!key) {
      return next();
    }

    // 1. Отримуємо дані зі сховища
    let sessionData: S | undefined = await Promise.resolve(storage.get(key));
    // 2. Якщо даних немає, викликаємо initial() або створюємо порожній об'єкт
    if (sessionData == null) {
      sessionData = options?.initial ? options.initial() : ({} as S);
    }

    // 3. Кладемо сесію в контекст
    ctx.session = sessionData;

    await next();

    if (ctx.session == null) {
      await Promise.resolve(storage.delete(key));
    } else {
      await Promise.resolve(storage.set(key, ctx.session));
    }
  };
}

export * from './storage';
export * from './memory-storage';
export * from './gas-storage';
export * from './gas-cache-storage';
export * from './gas-hybrid-storage';