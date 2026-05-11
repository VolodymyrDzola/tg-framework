import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GasHybridStorage } from './gas-hybrid-storage';

describe('GasHybridStorage', () => {
  let storage: GasHybridStorage<any>;

  let mockCache: any;
  let mockProperties: any;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      put: jest.fn(),
      remove: jest.fn(),
    };

    mockProperties = {
      getProperty: jest.fn(),
      setProperty: jest.fn(),
      deleteProperty: jest.fn(),
    };

    // Передаємо як об'єкт згідно з конструктором
    storage = new GasHybridStorage({
      properties: mockProperties,
      cache: mockCache
    });
  });

  it('повинен читати дані з CacheService, якщо вони там є', async () => {
    mockCache.get.mockReturnValue(JSON.stringify({ secret: 'data' }));

    const result = await storage.get('my_key');

    // ТУТ ЗМІНА: Додаємо префікс "session:"
    expect(mockCache.get).toHaveBeenCalledWith('session:my_key');
    expect(mockProperties.getProperty).not.toHaveBeenCalled();
    expect(result).toEqual({ secret: 'data' });
  });

  it('повинен записувати дані в обидва сервіси', async () => {
    const dataToSave = { user: 'admin' };
    await storage.set('my_key', dataToSave);
    const stringified = JSON.stringify(dataToSave);

    // ТУТ ЗМІНИ: Додаємо префікс "session:" всюди
    expect(mockCache.put).toHaveBeenCalledWith('session:my_key', stringified, expect.any(Number));
    expect(mockProperties.setProperty).toHaveBeenCalledWith('session:my_key', stringified);
  });
});