// src/adapters/web.ts
import { BaseTelegramClient } from '../core/base-api';

export class FetchApiClient extends BaseTelegramClient {
  public async callApi<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.baseUrl}/${method}`;

    let fileIndex = 0;
    const files: Record<string, Blob> = {};

    const extractFiles = (value: unknown): unknown => {
      if (value == null) return value;

      let isFile = false;
      let blobValue: Blob | null = null;

      if (value instanceof Blob) {
        isFile = true;
        blobValue = value;
      }
      else if (
        typeof globalThis !== 'undefined' &&
        (globalThis as any).Buffer &&
        (globalThis as any).Buffer.isBuffer(value)
      ) {
        isFile = true;
        blobValue = new Blob([value as any]);
      }

      if (isFile && blobValue) {
        const attachName = `file_attach_${fileIndex++}`;
        files[attachName] = blobValue;
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
    let requestOptions: RequestInit;

    if (hasFiles) {
      const form = new FormData();

      for (const [key, file] of Object.entries(files)) {
        form.append(key, file, `${key}.file`);
      }
      for (const [key, value] of Object.entries(processedPayload)) {
        if (value == null) continue;
        if (typeof value === 'object') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, String(value));
        }
      }

      requestOptions = {
        method: 'POST',
        body: form,
      };
    } else {
      requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedPayload),
      };
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const textData = await response.text();
      try {
        const jsonData = JSON.parse(textData);
        throw new Error(`Telegram API Error [${method}] ${response.status}: ${jsonData.description}`);
      } catch {
        throw new Error(`Telegram HTTP Error ${response.status}: ${textData}`);
      }
    }

    const data = (await response.json()) as any;

    if (!data.ok) {
      throw new Error(`Telegram Logic Error [${method}]: ${data.description}`);
    }

    return data.result as T;
  }
}