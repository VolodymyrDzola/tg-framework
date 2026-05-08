import {
  Message,
  Update,
  CallbackQuery,
  SendMessageParams,
  SendPhotoParams,
  AnswerCallbackQueryParams,
  TelegramBotApi,
  MaybeInaccessibleMessage,
  EditMessageTextParams,
  InputFile,
  SendDocumentParams,
  SendVideoParams,
  ReactionType,
  MessageId,
  EditMessageCaptionParams,
  InlineKeyboardMarkup,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
  ForceReply,
  SendInvoiceParams,
  AnswerShippingQueryParams,
  SendGameParams,
  SetGameScoreParams,
  GameHighScore,
  InlineKeyboardButton,
  SendLivePhotoParams,
  SendGiftParams,
  DeleteMessageReactionParams,
  AnswerGuestQueryParams,
  InlineQueryResult,
  SentGuestMessage,
  SendPollParams,
  InputPollOption,
  InputPaidMediaPhoto,
  SendPaidMediaParams,
  InputPaidMediaVideo,
  InputPaidMediaLivePhoto,
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
  InputMediaLivePhoto,
  SendMediaGroupParams,
  SendMessageDraftParams,
  DeleteAllMessageReactionsParams
} from "../types/telegram";
import { InlineKeyboard, ReplyKeyboard } from "./keyboard";

export class Context {
  public readonly update: Update;
  public readonly message?: MaybeInaccessibleMessage;
  public readonly callbackQuery?: CallbackQuery;
  public readonly api: TelegramBotApi;

  constructor(update: Update, api: TelegramBotApi) {
    this.update = update;
    this.api = api;

    // Шукаємо повідомлення в усіх можливих полях оновлення
    this.message =
      update.message ||
      update.edited_message ||
      update.channel_post ||
      update.edited_channel_post ||
      update.callback_query?.message ||
      update.business_message ||
      update.edited_business_message ||
      update.guest_message;

    this.callbackQuery = update.callback_query;
  }

  /**
   * ID чату, в якому відбулася подія
   */
  public get chatId(): number | undefined {
    return (
      this.message?.chat?.id ||
      this.update.my_chat_member?.chat.id ||
      this.update.chat_member?.chat.id ||
      this.update.chat_join_request?.chat.id
    );
  }

  /**
   * Користувач, який ініціював подію
   */
  public get from() {
    const msg = this.message;
    if (msg && "from" in msg) {
      return msg.from;
    }
    return (
      this.callbackQuery?.from ||
      this.update.inline_query?.from ||
      this.update.my_chat_member?.from ||
      this.update.chat_member?.from ||
      this.update.chat_join_request?.from
    );
  }

  /**
   * Текст повідомлення або підпис до медіафайлу
   */
  public get text(): string | undefined {
    const msg = this.message;
    if (!msg) return undefined;

    if ("text" in msg) return msg.text;
    if ("caption" in msg) return msg.caption;

    return undefined;
  }

  /**
   * Універсальний хелпер для отримання ID чату та повідомлення.
   * @param operation Назва операції для тексту помилки
   * @param force Чи обов'язково повідомлення має бути доступним?
   *              (true для edit/delete, false для reply)
   */
  private getRequiredIds(operation: string): { chatId: number; messageId: number };
  private getRequiredIds(operation: string, force: true): { chatId: number; messageId: number };
  private getRequiredIds(operation: string, force: false): { chatId: number; messageId: number | undefined };
  private getRequiredIds(operation: string, force: boolean = true): { chatId: number; messageId: number | undefined } {
    const chatId = this.chatId;

    if (!chatId) {
      throw new Error(`Неможливо виконати ${operation}: chat_id не знайдено.`);
    }

    // Якщо це "м'яка" перевірка (force: false)
    if (!force) {
      return {
        chatId,
        messageId: this.isMessageAccessible ? this.message?.message_id : undefined
      };
    }

    // Якщо це "жорстка" перевірка (force: true)
    const messageId = this.message?.message_id;
    if (!this.isMessageAccessible || !messageId) {
      throw new Error(`Неможливо виконати ${operation}: повідомлення недоступне або видалене.`);
    }

    return { chatId, messageId };
  }


  /**
   * Перевіряє, чи є повідомлення доступним для читання/відповіді (не є InaccessibleMessage)
   */
  public get isMessageAccessible(): boolean {
    return !!this.message && this.message.date !== 0;
  }

  /**
   * Відповісти на поточне повідомлення текстовим повідомленням
   * 
   * @param text - текст повідомлення
   * @param options - об'єкт параметрів
   * @returns `Promise<Message>`
   */
  public async reply(
    text: string,
    options?: Omit<SendMessageParams, "chat_id" | "text">
  ): Promise<Message> {
    const { chatId, messageId } = this.getRequiredIds("reply", false);

    return this.api.sendMessage({
      chat_id: chatId,
      text,
      reply_parameters: messageId ? { message_id: messageId } : undefined,
      ...options,
    });
  }

  /**
   * Відповісти на поточне повідомлення з клавіатурою (Inline або Reply)
   * @param text - текст повідомлення
   * @param keyboard - клавіатура
   * @param options - об'єкт параметрів
   * @returns `Promise<Message>`
   */
  public async replyWithKeyboard(
    text: string,
    keyboard: InlineKeyboard | ReplyKeyboard | InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply,
    options?: Omit<SendMessageParams, "chat_id" | "text" | "reply_markup">
  ): Promise<Message> {
    return this.reply(text, {
      reply_markup: keyboard as any,
      ...options,
    });
  }

  /**
   * Швидка відповідь з Inline-клавіатурою
   * @param text - текст повідомлення
   * @param buttons - клавіатура
   * @param options - об'єкт параметрів
   * @returns `Promise<Message>`
   */
  public async replyWithInlineKeyboard(
    text: string,
    buttons: InlineKeyboardButton[][] | InlineKeyboard,
    options?: Omit<SendMessageParams, "chat_id" | "text" | "reply_markup">
  ): Promise<Message> {
    const reply_markup = buttons instanceof InlineKeyboard
      ? buttons
      : { inline_keyboard: buttons };

    return this.reply(text, {
      reply_markup: reply_markup as any,
      ...options,
    });
  }

  /**
   * Відповісти на поточне повідомлення фотографією
   * @param photo URL картинки або `file_id`
   * @param options Об'єкт параметрів або просто текст сповіщення
   * @returns `Promise<Message>`
   */
  public async replyWithPhoto(
    photo: string | InputFile,
    options?: Omit<SendPhotoParams, "chat_id" | "photo">
  ): Promise<Message> {
    const { chatId, messageId } = this.getRequiredIds("replyWithPhoto", false);

    return this.api.sendPhoto({
      chat_id: chatId,
      photo: photo,
      reply_parameters: messageId ? { message_id: messageId } : undefined,
      ...options,
    });
  }

  /**
   * Відповісти на поточне повідомлення відеофайлом
   * @param video URL відео або `file_id`
   * @param options Об'єкт параметрів або просто текст сповіщення
   * @returns `Promise<Message>`
   */
  public async replyWithVideo(
    video: string | InputFile,
    options?: Omit<SendVideoParams, "chat_id" | "video">
  ): Promise<Message> {
    const { chatId, messageId } = this.getRequiredIds("replyWithVideo", false);

    return this.api.sendVideo({
      chat_id: chatId,
      video: video,
      reply_parameters: messageId ? { message_id: messageId } : undefined,
      ...options,
    });
  }

  /**
   * Відповісти на поточне повідомлення документом (файлом)
   * @param document URL файлу або `file_id`
   * @param options Об'єкт параметрів або просто текст сповіщення
   * @returns `Promise<Message>`
   */
  public async replyWithDocument(
    document: string | InputFile,
    options?: Omit<SendDocumentParams, "chat_id" | "document">
  ): Promise<Message> {
    const { chatId, messageId } = this.getRequiredIds("replyWithDocument", false);

    return this.api.sendDocument({
      chat_id: chatId,
      document: document,
      reply_parameters: messageId ? { message_id: messageId } : undefined,
      ...options,
    });
  }

  /**
   * Відповісти на поточне повідомлення "живим фото" (Live Photo)
   * @param photo URL фотографії або `file_id`
   * @param livePhoto URL "живого фото" або `file_id`
   * @param options Об'єкт параметрів або просто текст сповіщення
   * @returns `Promise<Message>`
   */
  public async replyWithLivePhoto(
    photo: string | InputFile,
    livePhoto: string | InputFile,
    options?: Omit<SendLivePhotoParams, "chat_id" | "photo" | "live_photo">
  ): Promise<Message> {
    const { chatId, messageId } = this.getRequiredIds("replyWithLivePhoto", false);

    return this.api.sendLivePhoto({
      chat_id: chatId,
      photo,
      live_photo: livePhoto,
      reply_parameters: messageId ? { message_id: messageId } : undefined,
      ...options
    });
  }

  /**
   * Надіслати подарунок (Star Gift) поточному користувачу
   * @param giftId ID подарунка
   * @param options Об'єкт параметрів
   * @returns `Promise<boolean>`
   */
  public async sendGift(
    giftId: string,
    options?: Omit<SendGiftParams, "user_id" | "chat_id" | "gift_id">
  ): Promise<boolean> {
    const fromId = this.from?.id;
    if (!fromId) throw new Error("Неможливо надіслати подарунок: user_id не знайдено.");

    return this.api.sendGift({
      user_id: fromId,
      gift_id: giftId,
      ...options
    });
  }

  /**
   * Прибрати завантаження з інлайн-кнопки
   * @param params Об'єкт параметрів або просто текст сповіщення
   * @returns `Promise<boolean>`
   */
  public async answerCbQuery(
    params?: (Partial<AnswerCallbackQueryParams>) | string
  ): Promise<boolean> {
    // 1. Визначаємо ID: пріоритет у переданого в params, інакше — з контексту
    const cbId = (typeof params === 'object' ? params?.callback_query_id : undefined) || this.callbackQuery?.id;

    if (!cbId) {
      throw new Error("Неможливо виконати answerCbQuery: callback_query_id не знайдено.");
    }

    // 2. Якщо передано рядок — це скорочення для { text: "..." }
    if (typeof params === "string") {
      return this.api.answerCallbackQuery({
        callback_query_id: cbId,
        text: params,
      });
    }

    // 3. Якщо передано об'єкт — використовуємо його, додаючи/перевизначаючи ID
    return this.api.answerCallbackQuery({
      ...params,
      callback_query_id: cbId,
    });
  }

  /**
   * Поставити реакцію на поточне повідомлення
   * @param reactions Масив реакцій (наприклад: `[{ type: "emoji", emoji: "👍" }]`)
   * @returns `Promise<boolean>`
   */
  public async react(reactions: ReactionType[]): Promise<boolean> {
    const { chatId, messageId } = this.getRequiredIds("react", true);

    return this.api.setMessageReaction({
      chat_id: chatId,
      message_id: messageId,
      reaction: reactions,
    });
  }

  /**
   * Надіслати статус дії в поточний чат (наприклад, "typing", "upload_photo")
   * @param action Статус дії (наприклад, "typing", "upload_photo")
   * @returns `Promise<boolean>`
   */
  public async replyWithChatAction(
    action: "typing" | "upload_photo" | "record_video" | "upload_video" | "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location" | "record_video_note" | "upload_video_note"
  ): Promise<boolean> {
    const { chatId } = this.getRequiredIds("replyWithChatAction", false);

    return this.api.sendChatAction({
      chat_id: chatId,
      action: action,
    });
  }

  /**
   * Видалити поточне повідомлення
   * @returns `Promise<boolean>`
   */
  public async deleteMessage(): Promise<boolean> {
    const { chatId, messageId } = this.getRequiredIds("deleteMessage", true);

    return this.api.deleteMessage({
      chat_id: chatId,
      message_id: messageId,
    });
  }

  /**
   * Редагувати текст поточного повідомлення
   * @param text - текст повідомлення
   * @param options - об'єкт параметрів
   * @returns `Promise<Message | boolean>`
   */
  public async editMessage(
    text: string,
    options?: Omit<EditMessageTextParams, "chat_id" | "text" | "message_id">
  ): Promise<Message | boolean> {
    const { chatId, messageId } = this.getRequiredIds("editMessage");

    return this.api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text,
      ...options,
    });
  }

  /**
   * Переслати поточне повідомлення в інший чат
   * @param toChatId - ID чату, куди пересилаємо повідомлення
   * @returns `Promise<Message>`
   */
  public async forwardTo(toChatId: string | number): Promise<Message> {
    const { chatId, messageId } = this.getRequiredIds("forwardTo", true);

    return this.api.forwardMessage({
      chat_id: toChatId,
      from_chat_id: chatId,
      message_id: messageId,
    });
  }

  /**
   * Скопіювати поточне повідомлення в інший чат
   * @param toChatId - ID чату, куди копіюємо повідомлення
   * @returns `Promise<MessageId>`
   */
  public async copyTo(toChatId: string | number): Promise<MessageId> {
    const { chatId, messageId } = this.getRequiredIds("copyTo", true);

    return this.api.copyMessage({
      chat_id: toChatId,
      from_chat_id: chatId,
      message_id: messageId,
    });
  }

  /**
   * Повертає аргументи команди (все, що йде після назви команди).
   * Наприклад: для повідомлення "/start ref_123" поверне "ref_123".
   * Якщо це просто "/start", поверне порожній рядок.
   * @returns `string`
   */
  public get payload(): string {
    const txt = this.text;
    if (!txt || !txt.startsWith('/')) return '';

    const parts = txt.split(/\s+/); // Розбиваємо по пробілах (один або більше)
    if (parts.length <= 1) return '';

    return parts.slice(1).join(' ').trim();
  }

  /**
   * ID користувача, який ініціював подію
   * @returns `number | undefined`
   */
  public get senderId(): number | undefined {
    return this.from?.id;
  }

  /**
   * Змінити лише інлайн-клавіатуру поточного повідомлення
   * @param replyMarkup - клавіатура
   * @returns `Promise<Message | boolean>`
   */
  public async editReplyMarkup(
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<Message | boolean> {
    const { chatId, messageId } = this.getRequiredIds("editReplyMarkup", true);

    return this.api.editMessageReplyMarkup({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup, // Якщо передати undefined, клавіатура зникне
    });
  }

  /**
   * Змінити підпис до поточного медіафайлу (фото/відео)
   * @param caption - підпис
   * @param options - об'єкт параметрів
   * @returns `Promise<Message | boolean>`
   */
  public async editCaption(
    caption: string,
    options?: Omit<EditMessageCaptionParams, "chat_id" | "message_id" | "caption">
  ): Promise<Message | boolean> {
    const { chatId, messageId } = this.getRequiredIds("editCaption", true);

    return this.api.editMessageCaption({
      chat_id: chatId,
      message_id: messageId,
      caption: caption,
      ...options,
    });
  }

  /**
   * Отримати список адміністраторів поточного чату
   * @returns `Promise<ChatMember[]>`
   */
  public async getAdministrators() {
    const { chatId } = this.getRequiredIds("getAdministrators", false);
    return this.api.getChatAdministrators({ chat_id: chatId });
  }

  /**
   * Отримати інформацію про конкретного учасника в поточному чаті
   * @param userId - ID користувача
   * @returns `Promise<ChatMember>`
   */
  public async getMember(userId: number) {
    const { chatId } = this.getRequiredIds("getMember", false);
    return this.api.getChatMember({ chat_id: chatId, user_id: userId });
  }

  /**
   * Вийти з поточного чату (групи/каналу)
   * @returns `Promise<boolean>`
   */
  public async leaveChat(): Promise<boolean> {
    const { chatId } = this.getRequiredIds("leaveChat", false);
    return this.api.leaveChat({ chat_id: chatId });
  }

  // --- ПЛАТЕЖІ (PAYMENTS) ---

  /**
   * Надіслати рахунок на оплату (Invoice) у поточний чат
   * @param params - об'єкт параметрів
   * @returns `Promise<Message>`
   */
  public async replyWithInvoice(
    params: Omit<SendInvoiceParams, "chat_id">
  ): Promise<Message> {
    const { chatId } = this.getRequiredIds("replyWithInvoice", false);
    return this.api.sendInvoice({
      chat_id: chatId,
      ...params,
    });
  }

  /**
   * Відповісти на запит доставки (Shipping Query)
   * @param ok - чи все гаразд
   * @param options - об'єкт параметрів
   * @returns `Promise<boolean>`
   */
  public async answerShippingQuery(
    ok: boolean,
    options?: Omit<AnswerShippingQueryParams, "shipping_query_id" | "ok">
  ): Promise<boolean> {
    const queryId = this.update.shipping_query?.id;
    if (!queryId) throw new Error("Неможливо відповісти на Shipping Query: id не знайдено.");

    return this.api.answerShippingQuery({
      shipping_query_id: queryId,
      ok,
      ...options,
    });
  }

  /**
   * Відповісти на запит фінального підтвердження замовлення (Pre-checkout Query)
   * @param ok - чи все гаразд
   * @param errorMessage - повідомлення про помилку
   * @returns `Promise<boolean>`
   */
  public async answerPreCheckoutQuery(
    ok: boolean,
    errorMessage?: string
  ): Promise<boolean> {
    const queryId = this.update.pre_checkout_query?.id;
    if (!queryId) throw new Error("Неможливо відповісти на Pre-checkout Query: id не знайдено.");

    return this.api.answerPreCheckoutQuery({
      pre_checkout_query_id: queryId,
      ok,
      error_message: errorMessage,
    });
  }

  // --- ІГРИ (GAMES) ---

  /**
   * Надіслати гру в поточний чат
   * @param gameShortName - короткий логін гри
   * @param options - об'єкт параметрів
   * @returns `Promise<Message>`
   */
  public async replyWithGame(
    gameShortName: string,
    options?: Omit<SendGameParams, "chat_id" | "game_short_name">
  ): Promise<Message> {
    const { chatId } = this.getRequiredIds("replyWithGame", false);
    return this.api.sendGame({
      chat_id: chatId,
      game_short_name: gameShortName,
      ...options,
    });
  }

  /**
   * Встановити рекорд для гравця в грі
   * @param score - рахунок гри
   * @param options - об'єкт параметрів
   * @returns `Promise<Message | boolean>`
   */
  public async setGameScore(
    score: number,
    options?: Omit<SetGameScoreParams, "user_id" | "score">
  ): Promise<Message | boolean> {
    const fromId = this.from?.id;
    if (!fromId) throw new Error("Неможливо встановити рахунок гри: user_id не знайдено.");

    // Пріоритет віддаємо inline_message_id, якщо він є
    const inlineId = this.callbackQuery?.inline_message_id;
    const { chatId, messageId } = inlineId ? { chatId: undefined, messageId: undefined } : this.getRequiredIds("setGameScore", true);

    return this.api.setGameScore({
      user_id: fromId,
      score,
      chat_id: chatId,
      message_id: messageId,
      inline_message_id: inlineId,
      ...options,
    });
  }

  /**
   * Отримати таблицю рекордів гри
   * @returns `Promise<GameHighScore[]>`
   */
  public async getGameHighScores(): Promise<GameHighScore[]> {
    const fromId = this.from?.id;
    if (!fromId) throw new Error("Неможливо отримати рекорди гри: user_id не знайдено.");

    const inlineId = this.callbackQuery?.inline_message_id;
    const { chatId, messageId } = inlineId ? { chatId: undefined, messageId: undefined } : this.getRequiredIds("getGameHighScores", true);

    return this.api.getGameHighScores({
      user_id: fromId,
      chat_id: chatId,
      message_id: messageId,
      inline_message_id: inlineId,
    });
  }

  /**
   * Відповісти на гостьовий запит (Guest Mode)
   * @param result - результат запиту
   * @param options - об'єкт параметрів
   * @returns `Promise<SentGuestMessage>`
   */
  public async answerGuest(
    result: InlineQueryResult,
    options?: Omit<AnswerGuestQueryParams, "guest_query_id" | "result">
  ): Promise<SentGuestMessage> {
    const msg = this.message as Message | undefined;
    const queryId = this.update.guest_message?.guest_query_id || msg?.guest_query_id;

    if (!queryId) throw new Error("Відсутній guest_query_id");

    return this.api.answerGuestQuery({
      guest_query_id: queryId,
      result: result,
      ...options
    });
  }

  /**
   * Видалити реакцію на поточному повідомленні.
   * За замовчуванням видаляє реакцію користувача, який ініціював подію.
   * @param options - об'єкт параметрів
   * @returns `Promise<boolean>`
   */
  public async deleteReaction(
    options?: Omit<DeleteMessageReactionParams, "chat_id" | "message_id">
  ): Promise<boolean> {
    const { chatId, messageId } = this.getRequiredIds("deleteReaction", true);

    // Якщо розробник не передав конкретний user_id чи actor_chat_id, 
    // за замовчуванням підставляємо ID поточного користувача
    const defaultOptions = (!options?.user_id && !options?.actor_chat_id)
      ? { user_id: this.from?.id }
      : {};

    return this.api.deleteMessageReaction({
      chat_id: chatId,
      message_id: messageId,
      ...defaultOptions,
      ...options
    });
  }

  /**
   * Видалити всі реакції конкретного користувача у поточному чаті (до 10 000).
   * За замовчуванням видаляє реакції користувача, який ініціював подію.
   * @param options - об'єкт параметрів
   * @returns `Promise<boolean>`
   */
  public async deleteAllReactions(
    options?: Omit<DeleteAllMessageReactionsParams, "chat_id">
  ): Promise<boolean> {
    const { chatId } = this.getRequiredIds("deleteAllReactions", false);

    const defaultOptions = (!options?.user_id && !options?.actor_chat_id)
      ? { user_id: this.from?.id }
      : {};

    return this.api.deleteAllMessageReactions({
      chat_id: chatId,
      ...defaultOptions,
      ...options
    });
  }

  /**
   * Надіслати опитування або вікторину (Poll / Quiz) у поточний чат.
   * Підтримує нові фічі API 10.0: media, explanation_media, 1 варіант відповіді.
   * @param question - текст опитування
   * @param pollOptions - варіанти відповідей
   * @param options - об'єкт параметрів
   * @returns `Promise<Message>`
   */
  public async replyWithPoll(
    question: string,
    pollOptions: (string | InputPollOption)[],
    options?: Omit<SendPollParams, "chat_id" | "question" | "options">
  ): Promise<Message> {
    const { chatId, messageId } = this.getRequiredIds("replyWithPoll", false);

    const formattedOptions: InputPollOption[] = pollOptions.map(option =>
      typeof option === "string" ? { text: option } : option
    );

    return this.api.sendPoll({
      chat_id: chatId,
      question: question,
      options: formattedOptions,
      reply_parameters: messageId ? { message_id: messageId } : undefined,
      ...options,
    });
  }

  /**
   * Стрімінг тимчасового повідомлення (Draft) для генерації відповідей (наприклад, ШІ).
   * Це ефемерне повідомлення живе 30 секунд. Після завершення обов'язково треба викликати звичайний reply().
   * @param draftId - унікальний ідентифікатор стріму (повинен бути > 0). Однакові ID анімують зміни.
   * @param options - об'єкт параметрів
   * @returns `Promise<boolean>`
   */
  public async replyWithDraft(
    draftId: number,
    options?: Omit<SendMessageDraftParams, "draft_id">
  ): Promise<boolean> {
    const { chatId } = this.getRequiredIds("replyWithDraft", false);

    return this.api.sendMessageDraft({
      chat_id: chatId,
      draft_id: draftId,
      ...options,
    });
  }

  /**
   * Надіслати групу медіафайлів (альбом).
   * Підтримує фото, відео, аудіо, документи та нові Live Photos (API 10.0).
   * @param media - масив медіафайлів
   * @param options - об'єкт параметрів
   * @returns `Promise<Message[]>`
   */
  public async replyWithMediaGroup(
    media: InputMediaAudio[] | InputMediaDocument[] | Array<InputMediaPhoto | InputMediaVideo | InputMediaLivePhoto>,
    options?: Omit<SendMediaGroupParams, "chat_id" | "media">
  ): Promise<Message[]> {
    const { chatId, messageId } = this.getRequiredIds("replyWithMediaGroup", false);

    return this.api.sendMediaGroup({
      chat_id: chatId,
      media,
      reply_parameters: messageId ? { message_id: messageId } : undefined,
      ...options,
    });
  }

  /**
   * Надіслати платне медіа, за перегляд якого користувач має заплатити Telegram Зірками.
   * @param starCount - кількість зірок, яку має заплатити користувач
   * @param media - масив медіафайлів
   * @param options - об'єкт параметрів
   * @returns `Promise<Message>`
   */
  public async replyWithPaidMedia(
    starCount: number,
    media: (InputPaidMediaPhoto | InputPaidMediaVideo | InputPaidMediaLivePhoto)[],
    options?: Omit<SendPaidMediaParams, "chat_id" | "star_count" | "media">
  ): Promise<Message> {
    const { chatId } = this.getRequiredIds("replyWithPaidMedia", false);

    return this.api.sendPaidMedia({
      chat_id: chatId,
      star_count: starCount,
      media,
      ...options,
    });
  }

}