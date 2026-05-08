import { Storage } from './storage';

/**
 * Сховище сесій для Google Apps Script на базі PropertiesService.
 * Дозволяє зберігати стан між різними запитами (doPost).
 * 
 * ✅ Плюси: надійне, не має ліміту в 6 годин, добре підходить для великих даних
 * ❌ Мінуси: повільніше за CacheService, має ліміт 500 запитів/день
 */
export class PropertiesStorage<T> implements Storage<T> {
  private service: GoogleAppsScript.Properties.Properties;
  private prefix: string;

  /**
   * @param service Яку службу використовувати (за замовчуванням ScriptProperties)
   * @param prefix Префікс для ключів у сховищі (щоб не перемішувати з іншими налаштуваннями)
   */
  constructor(
    service: GoogleAppsScript.Properties.Properties = PropertiesService.getScriptProperties(),
    prefix: string = 'session:'
  ) {
    this.service = service;
    this.prefix = prefix;
  }

  public get(key: string): T | undefined {
    const raw = this.service.getProperty(this.prefix + key);
    if (!raw) return undefined;

    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      console.error(`Помилка парсингу сесії для ключа ${key}:`, e);
      return undefined;
    }
  }

  public set(key: string, value: T): void {
    const raw = JSON.stringify(value);
    this.service.setProperty(this.prefix + key, raw);
  }

  public delete(key: string): void {
    this.service.deleteProperty(this.prefix + key);
  }

  /**
   * Очистити ВСІ сесії з цим префіксом
   */
  public clearAll(): void {
    const all = this.service.getProperties();
    for (const key in all) {
      if (key.startsWith(this.prefix)) {
        this.service.deleteProperty(key);
      }
    }
  }
}
