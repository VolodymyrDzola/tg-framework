// src/adapters/gas.ts
import { BaseTelegramClient, TelegramErrorResponse, TelegramApiResponse } from '../core/base-api';

export class GasApiClient extends BaseTelegramClient {
  constructor(token?: string) {
    const resolvedToken = token || (typeof PropertiesService !== 'undefined' ? PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') : null);

    if (!resolvedToken) {
      throw new Error(
        "UTF Error: BOT_TOKEN not found! " +
        "Please add it to 'Script Properties' in your Google Apps Script project."
      );
    }

    super(resolvedToken);
  }
  /**
   * Sends a request to the Telegram API.
   * @param method - method name
   * @param payload - parameters object
   * @returns `Promise<T>`
   */
  public async callApi<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.baseUrl}/${method}`;

    let fileIndex = 0;
    const files: Record<string, GoogleAppsScript.Base.Blob> = {};

    /**
     * Recursive function to find files in nested objects.
     * @param value - value to process
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
      let errorData: TelegramErrorResponse;
      try {
        errorData = JSON.parse(contentText);
      } catch {
        throw new Error(`HTTP Error ${statusCode}: ${contentText}`);
      }
      throw new Error(`Telegram API Error ${statusCode}: ${errorData.description}`);
    }

    const data = JSON.parse(contentText) as TelegramApiResponse<T>;

    if (!data.ok) {
      throw new Error(`Telegram Logic Error: ${data.description}`);
    }

    return data.result as T;
  }
}