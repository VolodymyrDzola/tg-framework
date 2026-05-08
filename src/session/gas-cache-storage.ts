import { Storage } from './storage';

/**
 * Сховище сесій для Google Apps Script на базі CacheService.
 * Швидке, але дані живуть максимум 6 годин (21600 секунд).
 */
export class CacheStorage<T> implements Storage<T> {
  private cache: GoogleAppsScript.Cache.Cache;
  private prefix: string;
  private ttl: number;

  /**
   * Швидке сховище сесій для Google Apps Script на базі CacheService.
   * Дані живуть максимум 6 годин (21600 секунд).
   * @param cache Яку службу кешу використовувати (за замовчуванням ScriptCache)
   * @param ttl Час життя в секундах (за замовчуванням 21600 - 6 годин)
   * @param prefix Префікс для ключів
   */
  constructor(
    cache: GoogleAppsScript.Cache.Cache = CacheService.getScriptCache(),
    ttl: number = 21600,
    prefix: string = 'session:'
  ) {
    this.cache = cache;
    this.ttl = ttl;
    this.prefix = prefix;
  }

  /**
   * Отримує сесію.
   * @param key Ключ сесії
   * @returns `T | undefined`
   */
  public get(key: string): T | undefined {
    const raw = this.cache.get(this.prefix + key);
    if (!raw) return undefined;

    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Зберігає сесію.
   * @param key Ключ сесії
   * @param value Значення сесії
   */
  public set(key: string, value: T): void {
    const raw = JSON.stringify(value);
    this.cache.put(this.prefix + key, raw, this.ttl);
  }

  /**
   * Видаляє сесію.
   * @param key Ключ сесії
   */
  public delete(key: string): void {
    this.cache.remove(this.prefix + key);
  }
}
