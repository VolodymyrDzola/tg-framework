import { Context } from './context';
import { Composer, Middleware } from './composer';
import { InlineKeyboard } from './keyboard';

type MenuPageOptions = {
  /** ID сторінки, куди веде кнопка "Назад". Якщо не вказано — кнопки не буде. */
  back?: string;
  /** Текст для кнопки "Назад" (за замовчуванням "⬅️ Назад") */
  backText?: string;
};

type MenuPageRender<C extends Context> = (ctx: C) => Promise<{ text: string; keyboard: InlineKeyboard }> | { text: string; keyboard: InlineKeyboard };

type PageEntry<C extends Context> = {
  render: MenuPageRender<C>;
  options?: MenuPageOptions;
};

/**
 * Клас для створення інтерактивних Inline-меню.
 */
export class InlineMenu<C extends Context & { menu?: InlineMenuManager }> extends Composer<C> {
  private pages = new Map<string, PageEntry<C>>();
  private id: string;

  constructor(id: string = 'main') {
    super();
    this.id = id;
  }

  /**
   * Додати сторінку в меню
   * @param id Унікальний ID сторінки
   * @param renderer Функція, що повертає текст та клавіатуру
   * @param options Налаштування сторінки (наприклад, кнопка Назад)
   */
  public page(id: string, renderer: MenuPageRender<C>, options?: MenuPageOptions): this {
    this.pages.set(id, { render: renderer, options });
    return this;
  }

  /**
   * Головний мідлвар меню
   */
  public middleware(): Middleware<C> {
    return async (ctx, next) => {
      ctx.menu = new InlineMenuManager(ctx, this.pages, this.id);

      if (ctx.callbackQuery?.data?.startsWith(`menu:${this.id}:`)) {
        const pageId = ctx.callbackQuery.data.split(':')[2];
        await ctx.menu.setPage(pageId);
        await ctx.answerCbQuery();
        return;
      }

      await next();
    };
  }
}

/**
 * Менеджер для керування меню всередині обробників
 */
class InlineMenuManager {
  constructor(
    private ctx: any,
    private pages: Map<string, PageEntry<any>>,
    private menuId: string
  ) { }

  /**
   * Перейти на вказану сторінку меню
   */
  public async setPage(pageId: string): Promise<void> {
    const entry = this.pages.get(pageId);
    if (!entry) throw new Error(`Сторінку меню "${pageId}" не знайдено.`);

    const { text, keyboard } = await Promise.resolve(entry.render(this.ctx));

    // Якщо в налаштуваннях сторінки вказано "батьківську" сторінку — додаємо кнопку Назад
    if (entry.options?.back) {
      keyboard.row().menu(entry.options.backText || '⬅️ Назад', this.menuId, entry.options.back);
    }

    const rawKeyboard = keyboard.toJSON();

    if (this.ctx.callbackQuery) {
      await this.ctx.editMessage(text, { reply_markup: rawKeyboard });
    } else {
      await this.ctx.reply(text, { reply_markup: rawKeyboard });
    }
  }

  public url(pageId: string): string {
    return `menu:${this.menuId}:${pageId}`;
  }
}
