// src/session/memory-storage.ts
import { Storage } from './storage';

/**w
 * Сховище сесій у пам'яті (Map).
 * Найшвидше, але дані втрачаються при перезапуску бота.
 *
 * ✅ Плюси: дуже швидке, не потребує налаштувань
 * ❌ Мінуси: дані не зберігаються між запитами
 */
export class MemoryStorage<T> implements Storage<T> {
  private store = new Map<string, T>();

  /**
   * Отримує сесію.
   * @param key Ключ сесії
   * @returns `T | undefined`
   */
  public get(key: string): T | undefined {
    return this.store.get(key);
  }

  /**
   * Зберігає сесію.
   * @param key Ключ сесії
   * @param value Значення сесії
   */
  public set(key: string, value: T): void {
    this.store.set(key, value);
  }

  /**
   * Видаляє сесію.
   * @param key Ключ сесії
   */
  public delete(key: string): void {
    this.store.delete(key);
  }
}