// src/adapters/gas.ts
import { BaseTelegramClient } from '../core/base-api';

export class GasApiClient extends BaseTelegramClient {
  /**
   * Відправляє запит до Telegram API.
   * @param method - назва методу
   * @param payload - об'єкт параметрів
   * @returns `Promise<T>`
   */
  public async callApi<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.baseUrl}/${method}`;

    let fileIndex = 0;
    const files: Record<string, GoogleAppsScript.Base.Blob> = {};

    /**
     * Рекурсивна функція для пошуку файлів у вкладених об'єктах.
     * @param value - значення для обробки
     * @returns `unknown`
     */
    const extractFiles = (value: unknown): unknown => {
      if (value == null) return value;

      if (typeof value === 'object' && typeof (value as any).getBytes === 'function') {
        const attachName = `file_attach_${fileIndex++}`;
        files[attachName] = value as GoogleAppsScript.Base.Blob;
        return `attach://${attachName}`;
      }

      if (Array.isArray(value)) {
        return value.map(extractFiles);
      }
      if (typeof value === 'object') {
        const processedObj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
          processedObj[k] = extractFiles(v);
        }
        return processedObj;
      }
      return value;
    };

    const processedPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      processedPayload[key] = extractFiles(value);
    }

    const hasFiles = Object.keys(files).length > 0;
    let options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

    if (hasFiles) {
      const multipartPayload: Record<string, any> = { ...files };

      for (const [key, value] of Object.entries(processedPayload)) {
        if (value == null) continue;
        if (typeof value === 'object') {
          multipartPayload[key] = JSON.stringify(value);
        } else {
          multipartPayload[key] = String(value);
        }
      }

      options = {
        method: 'post',
        payload: multipartPayload,
        muteHttpExceptions: true,
      };
    } else {
      options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(processedPayload),
        muteHttpExceptions: true,
      };
    }

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const contentText = response.getContentText();

    if (statusCode !== 200) {
      let errorData: any;
      try {
        errorData = JSON.parse(contentText);
      } catch {
        throw new Error(`HTTP Error ${statusCode}: ${contentText}`);
      }
      throw new Error(`Telegram API Error ${statusCode}: ${errorData.description}`);
    }

    const data = JSON.parse(contentText);

    if (!data.ok) {
      throw new Error(`Telegram Logic Error: ${data.description}`);
    }

    return data.result as T;
  }
}