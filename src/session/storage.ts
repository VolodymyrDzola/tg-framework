// src/session/storage.ts

/**
 * Інтерфейс сховища для сесій.
 * T - тип даних сесії, які ми зберігаємо.
 */
export interface Storage<T> {
  /**
   * Отримати дані сесії за ключем.
   */
  get(key: string): Promise<T | undefined> | T | undefined;

  /**
   * Зберегти дані сесії за ключем.
   */
  set(key: string, value: T): Promise<void> | void;

  /**
   * Видалити сесію (наприклад, якщо користувач завершив діалог).
   */
  delete(key: string): Promise<void> | void;
}