import { Storage } from './storage';
import { PropertiesStorage } from './gas-storage';
import { CacheStorage } from './gas-cache-storage';

/**
 * Гібридне сховище для Google Apps Script (CacheService + PropertiesService).
 * Поєднує швидкість кешу та надійність властивостей.
 */
export class GasHybridStorage<T> implements Storage<T> {
  private cache: CacheStorage<T>;
  private properties: PropertiesStorage<T>;

  /**
   * Гібридне сховище для Google Apps Script (CacheService + PropertiesService).
   * Поєднує швидкість кешу та надійність властивостей.
   * @param cache Яку службу кешу використовувати (за замовчуванням ScriptCache)
   * @param properties Яку службу властивостей використовувати (за замовчуванням ScriptProperties)
   * @param ttl Час життя в секундах (за замовчуванням 21600 - 6 годин)
   * @param prefix Префікс для ключів
   */
  constructor(options?: {
    cache?: GoogleAppsScript.Cache.Cache;
    properties?: GoogleAppsScript.Properties.Properties;
    ttl?: number;
    prefix?: string;
  }) {
    this.cache = new CacheStorage<T>(
      options?.cache,
      options?.ttl,
      options?.prefix
    );
    this.properties = new PropertiesStorage<T>(
      options?.properties,
      options?.prefix
    );
  }

  public async get(key: string): Promise<T | undefined> {
    // 1. Спробуємо взяти з швидкого кешу
    let data = await Promise.resolve(this.cache.get(key));

    if (data !== undefined) {
      return data;
    }

    // 2. Якщо в кеші немає — ліземо в повільні властивості
    data = await Promise.resolve(this.properties.get(key));

    // 3. Якщо знайшли в властивостях — оновлюємо кеш для наступного разу
    if (data !== undefined) {
      this.cache.set(key, data);
    }

    return data;
  }

  public async set(key: string, value: T): Promise<void> {
    // Пишемо в обидва сховища
    await Promise.all([
      Promise.resolve(this.cache.set(key, value)),
      Promise.resolve(this.properties.set(key, value))
    ]);
  }

  public async delete(key: string): Promise<void> {
    // Видаляємо з обох місць
    await Promise.all([
      Promise.resolve(this.cache.delete(key)),
      Promise.resolve(this.properties.delete(key))
    ]);
  }
}
