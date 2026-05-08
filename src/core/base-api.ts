// src/core/base-api.ts
import { TelegramBotApi } from '../types/telegram';

/**
 * Абстрактне ядро, яке описує транспортний рівень.
 */
export abstract class BaseTelegramClient {
  protected readonly baseUrl: string;

  /**
   * Створює новий екземпляр клієнта.
   * @param token - токен вашого бота
   */
  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  /**
   * Метод відправки, який кожна платформа реалізує сама.
   * @param method - назва методу
   * @param payload - об'єкт параметрів
   * @returns `Promise<T>`
   */
  public abstract callApi<T>(method: string, payload?: Record<string, unknown>): Promise<T>;

  /**
   * Proxy, що "вдає" повну імплементацію TelegramBotApi.
   * @returns `TelegramBotApi`
   */
  public get raw(): TelegramBotApi {
    return new Proxy({} as TelegramBotApi, {
      get: (target, method: string | symbol) => {
        if (typeof method !== 'string' || method === 'then') {
          return Reflect.get(target, method);
        }
        return (params: Record<string, unknown> = {}) => this.callApi(method, params);
      }
    });
  }
}