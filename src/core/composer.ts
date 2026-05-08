// src/core/composer.ts
import { Context } from './context';
/**
 * Тип для функції обробки помилок.
 */
export type ErrorHandler<C extends Context = Context> = (err: unknown, ctx: C) => Promise<void> | void;

/**
 * Тип для функції next(), яка передає керування наступному обробнику в черзі.
 */
export type NextFunction = () => Promise<void>;

/**
 * Строгий тип для автодоповнення в редакторі (аналог твого TChecking).
 * Містить ключі об'єкта Update, поля Message та типи сутностей (Entities).
 */
export type UpdateFilter =
  // Типи оновлень
  | 'message' | 'edited_message' | 'channel_post' | 'edited_channel_post' | 'callback_query'
  | 'business_connection' | 'business_message' | 'edited_business_message' | 'deleted_business_messages'
  | 'message_reaction' | 'message_reaction_count' | 'chat_boost' | 'removed_chat_boost' | 'guest_message'
  // Поля повідомлення
  | 'text' | 'photo' | 'document' | 'audio' | 'video' | 'voice' | 'animation' | 'sticker' | 'contact' | 'location' | 'live_photo'
  // Сутності (Entities) та кастомний тип
  | 'command' | 'bot_command' | 'hashtag' | 'url' | 'mention' | 'email' | 'phone_number';

/**
 * Головний тип нашого обробника (мідлвара).
 * Він приймає контекст (ctx) та функцію передачі естафети (next).
 */
export type Middleware<C extends Context = Context> = (ctx: C, next: NextFunction) => Promise<unknown> | void;
// ==========================================
// МАГІЯ ЗВУЖЕННЯ ТИПІВ (TYPE NARROWING)
// ==========================================

/**
 * Допоміжний тип, який гарантує наявність певних полів у Message
 * залежно від переданого фільтра.
 */
type NarrowedMessage<F extends UpdateFilter> =
  F extends 'text' ? { text: string } :
  F extends 'photo' ? { photo: any[] } : // Можна імпортувати PhotoSize[] з telegram.ts
  F extends 'document' ? { document: any } :
  F extends 'video' ? { video: any } :
  F extends 'voice' ? { voice: any } :
  F extends 'location' ? { location: any } :
  F extends 'live_photo' ? { live_photo: any, photo: any[] } :
  {}; // Якщо фільтр не специфічний, нічого не додаємо

/**
 * Головний тип звуженого контексту.
 * Він розширює базовий контекст C, роблячи певні поля ОБОВ'ЯЗКОВИМИ.
 */
export type NarrowedContext<C extends Context, F extends UpdateFilter> = C & {
  // Якщо фільтр - 'callback_query', то ctx.callbackQuery 100% існує
  callbackQuery: F extends 'callback_query'
  ? NonNullable<C['callbackQuery']>
  : C['callbackQuery'];

  // Якщо фільтр стосується повідомлень, то ctx.message 100% існує, 
  // і ми додаємо туди специфічні поля з NarrowedMessage
  message: F extends 'message' | 'text' | 'photo' | 'document' | 'audio' | 'video' | 'voice' | 'animation' | 'sticker' | 'contact' | 'location' | 'live_photo' | 'guest_message' | 'business_message'
  ? NonNullable<C['message']> & NarrowedMessage<F>
  : C['message'];
};
export class Composer<C extends Context = Context> {
  // Тут ми зберігаємо весь наш ланцюжок обробників
  private handlers: Middleware<C>[] = [];

  private errorHandler?: ErrorHandler<C>;

  public catch(handler: ErrorHandler<C>): this {
    this.errorHandler = handler;
    return this;
  }
  /**
   * Додає загальний обробник або ЦІЛИЙ МОДУЛЬ (інший Composer).
   */
  public use(...middlewares: (Middleware<C> | Composer<C>)[]): this {
    middlewares.forEach(middleware => {
      if (middleware instanceof Composer) {
        // Якщо це окремий файл з командами (модуль), витягуємо з нього ланцюжок
        this.handlers.push(middleware.middleware());
      } else {
        // Якщо це звичайна функція
        this.handlers.push(middleware);
      }
    });
    return this;
  }

  /**
   * Реєструє обробник для конкретної команди (або масиву команд).
   * 
   * @param command Назва команди без скісної риски (напр. 'start' або ['start', 'help'])
   * @param middlewares Функції, які виконаються, якщо команда збігається
   */
  public command(command: string | string[], ...middlewares: Middleware<C>[]): this {
    const commands = Array.isArray(command) ? command : [command];

    // Створюємо "фільтр-мідлвар"
    const filterMiddleware: Middleware<C> = async (ctx, next) => {
      const text = ctx.text;

      // Якщо тексту немає або він не починається зі скісної риски — це не команда
      if (!text || !text.startsWith('/')) {
        return next(); // Передаємо естафету далі
      }

      // Витягуємо чисту назву команди (ігноруємо '@bot_username', якщо він є)
      const cmdText = text.split(' ')[0].split('@')[0].substring(1);

      if (commands.includes(cmdText)) {
        // Якщо команда наша — запускаємо передані обробники
        await Composer.compose(middlewares)(ctx, next);
      } else {
        // Якщо команда чужа — йдемо далі
        await next();
      }
    };

    this.handlers.push(filterMiddleware);
    return this;
  }

  /**
   * Реєструє обробник для натискань на інлайн-кнопки (callback_query).
   * 
   * @param actionName Рядок або регулярний вираз для перевірки callback_data
   * @param middlewares Функції, які виконаються при збігу
   */
  public action(actionName: string | RegExp, ...middlewares: Middleware<C>[]): this {
    const filterMiddleware: Middleware<C> = async (ctx, next) => {
      // Перевіряємо, чи є в оновленні callback_query та його дані
      const callbackData = ctx.callbackQuery?.data;

      if (!callbackData) {
        return next();
      }

      // Перевіряємо збіг (якщо це рядок - точна відповідність, якщо RegExp - перевірка паттерну)
      const isMatch = typeof actionName === 'string'
        ? callbackData === actionName
        : actionName.test(callbackData);

      if (isMatch) {
        await Composer.compose(middlewares)(ctx, next);
      } else {
        await next();
      }
    };

    this.handlers.push(filterMiddleware);
    return this;
  }

  /**
     * Реєструє обробник, який спрацює за певних умов (тип оновлення, наявність поля чи сутності).
     * * @param filter Назва поля або масив назв (наприклад, 'photo', 'document', 'callback_query')
     * @param middlewares Функції-обробники, які виконаються при збігу
     */
  public on<F extends UpdateFilter>(
    filter: F | F[],
    ...middlewares: Middleware<NarrowedContext<C, F>>[]
  ): this {
    const filters = Array.isArray(filter) ? filter : [filter];

    const filterMiddleware: Middleware<any> = async (ctx, next) => {
      const updateAny = ctx.update as any;
      const messageAny = ctx.message as any;

      const isMatch = filters.some(checking => {
        // Об'єднуємо сутності з тексту та з підпису до медіафайлів
        const entities = messageAny?.entities || messageAny?.caption_entities || [];

        // Перевірка на команди
        if (checking === 'command') {
          return entities.some((e: { type: string }) => e.type === 'bot_command');
        }

        // Перевірка на інші сутності (hashtag, url, mention тощо)
        const isEntity = entities.some((e: { type: string }) => e.type === checking);
        if (isEntity) return true;

        // Перевірка наявності поля (photo, document, text) в УНІВЕРСАЛЬНОМУ message
        if (messageAny && checking in messageAny) return true;

        // Перевірка наявності поля в корені update (наприклад, callback_query)
        if (checking in updateAny) return true;

        return false;
      });

      if (isMatch) {
        await Composer.compose(middlewares as any)(ctx as any, next);
      } else {
        await next();
      }
    };

    this.handlers.push(filterMiddleware);
    return this;
  }

  /**
   * Магічний рушій: збирає масив мідлварів у єдиний ланцюг виконання.
   * Коли один мідлвар викликає next(), ця функція запускає наступний.
   */
  public static compose<C extends Context>(middlewares: Middleware<C>[]): Middleware<C> {
    return async (ctx: C, next: NextFunction) => {
      let index = -1;

      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) throw new Error('next() викликано кілька разів у одному мідлварі!');
        index = i;

        const middleware = middlewares[i];
        if (!middleware) {
          // Якщо обробники закінчилися, викликаємо фінальний next
          return next();
        }

        // Викликаємо поточний мідлвар і передаємо йому функцію для виклику наступного
        await middleware(ctx, () => dispatch(i + 1));
      };

      await dispatch(0);
    };
  }

  /**
   * Повертає всі зареєстровані в цьому класі обробники як одну велику функцію.
   * Огорнуто в try...catch для перехоплення помилок.
   */
  public middleware(): Middleware<C> {
    const composed = Composer.compose(this.handlers);

    return async (ctx: C, next: NextFunction) => {
      try {
        await composed(ctx, next);
      } catch (err) {
        if (this.errorHandler) {
          await this.errorHandler(err, ctx);
        } else {
          throw err;
        }
      }
    };
  }
}
