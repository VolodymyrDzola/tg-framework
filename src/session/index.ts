// src/session/index.ts
import { Context } from '../core/context';
import { Storage } from './storage';
import { MemoryStorage } from './memory-storage';

export interface SessionData extends Record<string, unknown> { }

declare module '../core/context' {
  interface Context {
    session?: SessionData;
  }
}

export interface SessionOptions<S extends SessionData> {
  /** Data storage (MemoryStorage by default) */
  storage?: Storage<S>;

  /** Key generation function ("chatId:userId" by default) */
  getSessionKey?: (ctx: Context) => string | undefined;

  /** Empty session initialization function (if data doesn't exist yet) */
  initial: () => S;
}

/**
 * Middleware for adding sessions to the context.
 */
export function sessionManager<S extends SessionData>(
  options: SessionOptions<S>
) {
  const storage = options.storage || new MemoryStorage<S>();
  const getSessionKey = options.getSessionKey || ((ctx: Context) => {
    const chatId = ctx.chatId;
    const fromId = ctx.from?.id;
    if (chatId == null || fromId == null) {
      return undefined; // If this is an event without chat/user, the session will not work
    }
    return `${chatId}:${fromId}`;
  });

  return async (ctx: Context & { session: S }, next: () => Promise<void>) => {
    const key = getSessionKey(ctx);

    // If the key is not generated (e.g., system update), just proceed further
    if (!key) {
      return next();
    }

    // 1. Get data from storage
    let sessionData: S | undefined = await Promise.resolve(storage.get(key));
    // 2. If data is missing, call initial() or create an empty object
    if (sessionData == null) {
      sessionData = options.initial();
    }

    // 3. Put the session into the context
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