// src/bot.ts
import { Composer } from './composer';
import { BaseTelegramClient } from './base-api';
import { SendMessageParams, Message, Update, GetUpdatesParams, SetWebhookParams, WebhookInfo, DeleteWebhookParams, User, ForwardMessageParams, ForwardMessagesParams, MessageId, CopyMessageParams, CopyMessagesParams, SendPhotoParams, SendAudioParams, SendDocumentParams, SendVideoParams, SendAnimationParams, SendVoiceParams, SendVideoNoteParams, SendPaidMediaParams, InputPaidMedia, SendMediaGroupParams, InputMediaVideo, InputMediaPhoto, InputMediaDocument, InputMediaAudio, SendLocationParams, SendVenueParams, SendContactParams, InputPollOption, SendPollParams, SendChecklistParams, InputChecklist, SendDiceParams, SendMessageDraftParams, SendChatActionParams, ReactionType, UserProfilePhotos, GetUserProfilePhotosParams, UserProfileAudios, GetUserProfileAudiosParams, SetUserEmojiStatusParams, GetFileParams, File as TelegramFile, BanChatMemberParams, UnbanChatMemberParams, RestrictChatMemberParams, ChatPermissions, PromoteChatMemberParams, SetChatMemberTagParams, SetChatPermissionsParams, ChatInviteLink, CreateChatInviteLinkParams, EditChatInviteLinkParams, CreateChatSubscriptionInviteLinkParams, EditChatSubscriptionInviteLinkParams, InputFile, PinChatMessageParams, UnpinChatMessageParams, ChatFullInfo, ChatMember, Sticker, CreateForumTopicParams, ForumTopic, EditForumTopicParams, AnswerCallbackQueryParams, UserChatBoosts, BusinessConnection, BotCommand, SetMyCommandsParams, DeleteMyCommandsParams, GetMyCommandsParams, SetMyNameParams, GetMyNameParams, BotName, SetMyDescriptionParams, GetMyDescriptionParams, BotDescription, SetMyShortDescriptionParams, GetMyShortDescriptionParams, BotShortDescription, SetMyProfilePhotoParams, InputProfilePhoto, SetChatMenuButtonParams, MenuButton, SetMyDefaultAdministratorRightsParams, GetMyDefaultAdministratorRightsParams, ChatAdministratorRights, Gifts, SendGiftParams, VerifyUserParams, VerifyChatParams, SetBusinessAccountNameParams, SetBusinessAccountUsernameParams, SetBusinessAccountBioParams, SetBusinessAccountProfilePhotoParams, RemoveBusinessAccountProfilePhotoParams, AcceptedGiftTypes, StarAmount, GetBusinessAccountGiftsParams, OwnedGifts, GetUserGiftsParams, GetChatGiftsParams, UpgradeGiftParams, TransferGiftParams, Story, InputStoryContent, PostStoryParams, RepostStoryParams, EditStoryParams, InlineQueryResult, SentWebAppMessage, PreparedInlineMessage, KeyboardButton, PreparedKeyboardButton, EditMessageTextParams, EditMessageCaptionParams, EditMessageMediaParams, InputMedia, EditMessageLiveLocationParams, StopMessageLiveLocationParams, EditMessageChecklistParams, EditMessageReplyMarkupParams, StopPollParams, ApproveSuggestedPostParams, DeclineSuggestedPostParams, Poll, SendStickerParams, StickerSet, InputSticker, CreateNewStickerSetParams, SetStickerMaskPositionParams, SetStickerSetThumbnailParams, AnswerInlineQueryParams, InlineQueryResultsButton, LabeledPrice, SendInvoiceParams, CreateInvoiceLinkParams, ShippingOption, AnswerPreCheckoutQueryParams, GetStarTransactionsParams, StarTransactions, SendGameParams, SetGameScoreParams, GetGameHighScoresParams, GameHighScore, GiftPremiumSubscriptionParams, SendLivePhotoParams, SentGuestMessage, GetChatAdministratorsParams, SavePreparedInlineMessageParams, DeleteAllMessageReactionsParams, DeleteMessageReactionParams, InputMediaLivePhoto, GetManagedBotAccessSettingsParams, BotAccessSettings, SetManagedBotAccessSettingsParams } from '../types/telegram';
import { Context } from './context';

/**
 * Статус дії бота в чаті
 */
export type ChatAction = "typing" | "upload_photo" | "record_video" | "upload_video" | "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location" | "record_video_note" | "upload_video_note";

type EditMessageIds =
  | { chat_id: number | string; message_id: number }
  | string;

// 1. Прокидаємо дженерик C до Composer
export class TelegramBot<C extends Context = Context> extends Composer<C> {

  constructor(private readonly client: BaseTelegramClient) {
    super();
  }

  /**
   * Головний метод для обробки вхідних Update від Telegram.
   * Він автоматично створює базовий об'єкт `Context` і запускає ланцюжок мідлварів.
   * * ⚠️ **Архітектурна примітка щодо кастомного контексту (Дженерик C):**
   * Ця бібліотека використовує підхід розширення контексту через інтерфейси та мідлвари 
   * (так звана гідратація/hydration), а не через наслідування класів. 
   * Під капотом завжди створюється базовий екземпляр `Context`, який примусово приводиться до вашого типу `C`.
   * * Щоб додати власні поля (наприклад, сесії, підключення до БД тощо), опишіть їх в інтерфейсі
   * та проініціалізуйте у вашому першому мідлварі:
   * * @example
   * interface MyContext extends Context {
   * db: CustomDatabase;
   * session: { step: number };
   * }
   * const bot = new TelegramBot<MyContext>(client);
   * * // Гідратація контексту
   * bot.use(async (ctx, next) => {
   * ctx.db = new CustomDatabase();
   * ctx.session = { step: 0 };
   * await next();
   * });
   * @param update Вхідне оновлення від Telegram
   * @returns `Promise<void>`
   */
  public async handleUpdate(update: Update): Promise<void> {
    const ctx = new Context(update, this.client.raw) as unknown as C;
    // Запускаємо ланцюжок мідлварів. 
    // Викликаємо this.middleware(), який повертає функцію з вбудованим try/catch та errorHandler
    await this.middleware()(ctx, async () => { });
  }

  public async launch(options: { timeout?: number; allowed_updates?: string[]; drop_pending_updates?: boolean } = {}): Promise<void> {
    console.log("🚀 Бот запускається в режимі Long Polling...");

    let offset = 0;
    const timeout = options.timeout ?? 30;

    if (options.drop_pending_updates) {
      await this.client.raw.deleteWebhook({ drop_pending_updates: true });
    } else {
      await this.client.raw.deleteWebhook({});
    }

    while (true) {
      try {
        const updates = await this.client.raw.getUpdates({
          offset,
          timeout,
          allowed_updates: options.allowed_updates
        });

        for (const update of updates) {
          offset = update.update_id + 1;

          this.handleUpdate(update).catch(err => {
            console.error("❌ Помилка в ланцюжку мідлварів:", err);
          });
        }
      } catch (error) {
        console.error("⚠️ Помилка мережі або API під час getUpdates:", error);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }


  /**
   * Використовуйте цей метод для отримання вхідних оновлень за допомогою довгого опитування.
   * Повертає масив об'єктів `Update`.
   * 
   * @param options Додаткові параметри для отримання оновлень
   * @returns `Update[]` у разі успіху
   */
  public async getUpdates(options: GetUpdatesParams = {}): Promise<Update[]> {
    return this.client.raw.getUpdates(options);
  }

  /**
   * Використовуйте цей метод для визначення URL-адреси та отримання вхідних оновлень через вихідний вебхук.
   * Щоразу, коли для бота з'являється оновлення, ми надсилатимемо HTTPS POST-запит на вказану URL-адресу, що містить серіалізоване оновлення JSON. 
   * У разі невдалого запиту (запит з кодом статусу відповіді HTTP, відмінним від 2XY), ми повторимо запит і припинимо його виконання після достатньої кількості спроб. 
   * Повертає `True` у разі успіху.
   * 
   * Якщо ви хочете переконатися, що вебхук було встановлено вами, ви можете вказати секретні дані в параметрі `secret_token`.
   * Якщо вказано, запит міститиме заголовок «X-Telegram-Bot-Api-Secret-Token» із секретним токеном як вмістом.
   * 
   * **Важливо:** Переконайтеся, що ваша URL-адреса використовує дійсний SSL-сертифікат. Запити з недійсними сертифікатами будуть ігноруватися.
   * Для тестування в локальному середовищі ви можете використовувати ngrok або подібні сервіси.
   * 
   * @param url URL-адреса вебхука
   * @param options Додаткові параметри вебхука
   * @returns `boolean` у разі успіху
   */
  public async setWebhook(url: string, options?: Omit<SetWebhookParams, 'url'>): Promise<boolean> {
    return this.client.raw.setWebhook({ url, ...options });
  }

  /**
   * Використовуйте цей метод для припинення використання вебхука та початку роботи в режимі long polling.
   * Повертає `True` у разі успіху.
   * 
   * @param options Додаткові параметри для видалення вебхука
   * @returns `boolean` у разі успіху
   */
  public async deleteWebhook(options?: DeleteWebhookParams): Promise<boolean> {
    return this.client.raw.deleteWebhook({ ...options });
  }

  /**
   * Використовуйте цей метод для отримання поточної інформації про вебхук, встановлений для вашого бота. Повертає `WebhookInfo`.
   * 
   * @returns `WebhookInfo` у разі успіху
   */
  public async getWebhookInfo(): Promise<WebhookInfo> {
    return this.client.raw.getWebhookInfo();
  }

  /**
   * Використовуйте цей метод для отримання інформації про бота.
   * Повертає `User`.
   * 
   * @returns `User` у разі успіху
   */
  public async getMe(): Promise<User> {
    return this.client.raw.getMe();
  }

  /**
   * Використовуйте цей метод для виходу бота.
   * Повертає `boolean`.
   * 
   * @returns `boolean` у разі успіху
   */
  public async logOut(): Promise<boolean> {
    return this.client.raw.logOut();
  }

  /**
   * Використовуйте цей метод, щоб закрити екземпляр бота перед його переміщенням з одного локального сервера на інший.
   * Вам потрібно видалити вебхук перед викликом цього методу, щоб бот не запустився знову після перезапуску сервера.
   * Метод повертатиме помилку 429 протягом перших 10 хвилин після запуску бота.
   * Повертає `True` у разі успіху.
   * 
   * @returns `True` у разі успіху
   */
  public async close(): Promise<boolean> {
    return this.client.raw.close();
  }

  /**
   * Використовуйте цей метод для відправлення тексту повідомлення.
   * Повертає `Message`.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату або юзернейм каналу (у форматі @channelusername)
   * @param text Текст повідомлення для відправки (1-4096 символів після аналізу сутностей)
   * @param options Додаткові параметри повідомлення
   * @returns `Message` у разі успіху
   */
  public async sendMessage(
    chat_id: string | number,
    text: string,
    options?: Omit<SendMessageParams, 'chat_id' | 'text'>
  ): Promise<Message> {
    return this.client.raw.sendMessage({
      chat_id,
      text,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для пересилання повідомлень будь-якого типу.
   * Службові повідомлення та повідомлення із захищеним вмістом не можна пересилати.
   * У разі успіху надіслане повідомлення повертається.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param from_chat_id Унікальний ідентифікатор чату, звідки пересилається повідомлення
   * @param message_id Ідентифікатор повідомлення в чаті `from_chat_id`
   * @param options Додаткові параметри пересилання
   * @returns `Message` у разі успіху
   */
  public async forwardMessage(
    chat_id: string | number,
    from_chat_id: string | number,
    message_id: number,
    options?: Omit<ForwardMessageParams, 'chat_id' | 'from_chat_id' | 'message_id'>
  ): Promise<Message> {
    return this.client.raw.forwardMessage({
      chat_id,
      from_chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для пересилання кількох повідомлень будь-якого типу.
   * Якщо деякі з указаних повідомлень не вдається знайти або переслати, вони пропускаються.
   * Службові повідомлення та повідомлення із захищеним вмістом не можна пересилати.
   * Для пересланих повідомлень зберігається групування за альбомами.
   * У разі успіху повертається масив `MessageId` надісланих повідомлень.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param from_chat_id Унікальний ідентифікатор чату, звідки пересилаються повідомлення
   * @param message_ids Масив ідентифікаторів повідомлень в чаті `chat_id`
   * @param options Додаткові параметри пересилання
   * @returns `MessageId[]` у разі успіху
   */
  public async forwardMessages(
    chat_id: string | number,
    from_chat_id: string | number,
    message_ids: number[],
    options?: Omit<ForwardMessagesParams, 'chat_id' | 'from_chat_id' | 'message_ids'>
  ): Promise<MessageId[]> {
    return this.client.raw.forwardMessages({
      chat_id,
      from_chat_id,
      message_ids,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для копіювання повідомлень будь-якого типу.
   * Службові повідомлення та повідомлення із захищеним вмістом не можна пересилати.
   * У разі успіху скопійоване повідомлення повертається.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param from_chat_id Унікальний ідентифікатор чату, звідки пересилаються повідомлення
   * @param message_id Ідентифікатор повідомлення в чаті `chat_id`
   * @param options Додаткові параметри копіювання
   * @returns `MessageId` у разі успіху
   */
  public async copyMessage(chat_id: string | number, from_chat_id: string | number, message_id: number, options?: Omit<CopyMessageParams, 'chat_id' | 'from_chat_id' | 'message_id'>): Promise<MessageId> {
    return this.client.raw.copyMessage({
      chat_id,
      from_chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для копіювання кількох повідомлень будь-якого типу.
   * Якщо деякі з указаних повідомлень не вдається знайти або скопіювати, вони пропускаються.
   * Службові повідомлення та повідомлення із захищеним вмістом не можна копіювати.
   * Для скопійованих повідомлень зберігається групування за альбомами.
   * У разі успіху повертається масив `MessageId` скопійованих повідомлень.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param from_chat_id Унікальний ідентифікатор чату, звідки пересилаються повідомлення
   * @param message_ids Ідентифікатори повідомлень у чаті `chat_id`
   * @param options Додаткові параметри копіювання
   * @returns `MessageId[]` у разі успіху
   */
  public async copyMessages(chat_id: string | number, from_chat_id: string | number, message_ids: number[], options?: Omit<CopyMessagesParams, 'chat_id' | 'from_chat_id' | 'message_ids'>): Promise<MessageId[]> {
    return this.client.raw.copyMessages({
      chat_id,
      from_chat_id,
      message_ids,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання фотографій у реальному часі.
   * У разі успіху надіслане повідомлення повертається.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param live_photo Відео частина живого фото (URL або InputFile)
   * @param photo Фотографія (URL або InputFile)
   * @param options Додаткові параметри надсилання
   * @returns `Promise<Message>`
   */
  public async sendLivePhoto(
    chat_id: string | number,
    live_photo: string | InputFile,
    photo: string | InputFile,
    options?: Omit<SendLivePhotoParams, 'chat_id' | 'photo' | 'live_photo'>
  ): Promise<Message> {
    return this.client.raw.sendLivePhoto({
      chat_id,
      photo,
      live_photo,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання фотографій.
   * У разі успіху надіслане повідомлення повертається.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param photo Фото для відправки (File ID, URL або об'єкт файлу)
   * @param options Додаткові параметри фото
   * @returns `Message` у разі успіху
   */
  public async sendPhoto(chat_id: string | number, photo: string | InputFile, options?: Omit<SendPhotoParams, 'chat_id' | 'photo'>): Promise<Message> {
    return this.client.raw.sendPhoto({
      chat_id,
      photo,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання аудіофайлів, якщо ви хочете, щоб клієнти Telegram відображали їх у музичному плеєрі.
   * Ваш аудіофайл має бути у форматі .MP3 або .M4A.
   * У разі успіху повертається надіслане повідомлення.
   * Боти наразі можуть надсилати аудіофайли розміром до 50 МБ, це обмеження може бути змінено в майбутньому.
   * Для надсилання голосових повідомлень використовуйте метод `sendVoice`.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param audio Аудіо для відправки (File ID, URL або об'єкт файлу)
   * @param options Додаткові параметри аудіо
   * @returns `Message` у разі успіху
   */
  public async sendAudio(chat_id: string | number, audio: string | InputFile, options?: Omit<SendAudioParams, 'chat_id' | 'audio'>): Promise<Message> {
    return this.client.raw.sendAudio({
      chat_id,
      audio,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання загальних файлів.
   * У разі успіху повертається надіслане повідомлення.
   * Боти наразі можуть надсилати файли будь-якого типу розміром до 50 МБ, це обмеження може бути змінено в майбутньому.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param document Файл для відправки (File ID, URL або об'єкт файлу)
   * @param options Додаткові параметри файлу
   * @returns `Message` у разі успіху
   */
  public async sendDocument(chat_id: string | number, document: string | InputFile, options?: Omit<SendDocumentParams, 'chat_id' | 'document'>): Promise<Message> {
    return this.client.raw.sendDocument({
      chat_id,
      document,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання відеофайлів.
   * Клієнти Telegram підтримують відео MPEG4 (інші формати можна надсилати як документ).
   * У разі успіху повертається надіслане повідомлення.
   * Боти наразі можуть надсилати відеофайли розміром до 50 МБ, це обмеження може бути змінено в майбутньому.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param video Відео для відправки (File ID, URL або об'єкт файлу)
   * @param options Додаткові параметри відео
   * @returns `Message` у разі успіху
   */
  public async sendVideo(chat_id: string | number, video: string | InputFile, options?: Omit<SendVideoParams, 'chat_id' | 'video'>): Promise<Message> {
    return this.client.raw.sendVideo({
      chat_id,
      video,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання анімаційних файлів (GIF або відео H.264/MPEG-4 AVC без звуку).
   * У разі успіху повертається надіслане повідомлення.
   * Боти наразі можуть надсилати анімаційні файли розміром до 50 МБ, це обмеження може бути змінено в майбутньому.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param animation Анімація для відправки (File ID, URL або об'єкт файлу)
   * @param options Додаткові параметри анімації
   * @returns `Message` у разі успіху
   */
  public async sendAnimation(chat_id: string | number, animation: string | InputFile, options?: Omit<SendAnimationParams, 'chat_id' | 'animation'>): Promise<Message> {
    return this.client.raw.sendAnimation({
      chat_id,
      animation,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання аудіофайлів, якщо ви хочете, щоб клієнти Telegram відображали файл як голосове повідомлення, яке можна відтворити.
   * Щоб це спрацювало, ваше аудіо має бути у файлі .OGG, закодованому за допомогою OPUS, або у форматі .MP3, або у форматі .M4A (інші формати можуть бути надіслані як аудіо або документ).
   * У разі успіху надіслане повідомлення повертається.
   * Боти наразі можуть надсилати голосові повідомлення розміром до 50 МБ, це обмеження може бути змінено в майбутньому.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param voice Аудіо для відправки (File ID, URL або об'єкт файлу)
   * @param options Додаткові параметри аудіо
   * @returns `Message` у разі успіху
   */
  public async sendVoice(chat_id: string | number, voice: string | InputFile, options?: Omit<SendVoiceParams, 'chat_id' | 'voice'>): Promise<Message> {
    return this.client.raw.sendVoice({
      chat_id,
      voice,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання відеоповідомлень (відеороликів тривалістю до 60 секунд).
   * Наразі тривалість відеоповідомлень обмежена 60 секундами, але це обмеження може бути змінено в майбутньому.
   * Боти наразі можуть надсилати відеоповідомлення розміром до 50 МБ, це обмеження може бути змінено в майбутньому.
   * У разі успіху повертається надіслане повідомлення.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param video_note Відеоповідомлення для відправки (File ID, URL або об'єкт файлу)
   * @param options Додаткові параметри відеоповідомлення
   * @returns `Message` у разі успіху
   */
  public async sendVideoNote(chat_id: string | number, video_note: string | InputFile, options?: Omit<SendVideoNoteParams, 'chat_id' | 'video_note'>): Promise<Message> {
    return this.client.raw.sendVideoNote({
      chat_id,
      video_note,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання платних медіафайлів.
   * У разі успіху надіслане повідомлення повертається.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param star_count Кількість зірок для надсилання
   * @param media Масив платних медіафайлів
   * @param options Додаткові параметри платних медіафайлів
   * @returns `Message` у разі успіху
   */
  public async sendPaidMedia(chat_id: string | number, star_count: number, media: InputPaidMedia[], options?: Omit<SendPaidMediaParams, 'chat_id' | 'star_count' | 'media'>): Promise<Message> {
    return this.client.raw.sendPaidMedia({
      chat_id,
      star_count,
      media,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання групи фотографій, відео, документів або аудіо як альбом.
   * Документи та аудіофайли можна групувати в альбомі лише з повідомленнями одного типу.
   * У разі успіху повертається масив надісланих об'єктів `Message`.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param media Масив медіафайлів для відправки
   * @param options Додаткові параметри медіафайлів
   * @returns `Message[]` у разі успіху
   */
  public async sendMediaGroup(
    chat_id: string | number,
    media: InputMediaAudio[] | InputMediaDocument[] | Array<InputMediaPhoto | InputMediaVideo | InputMediaLivePhoto>,
    options?: Omit<SendMediaGroupParams, 'chat_id' | 'media'>): Promise<Message[]> {
    return this.client.raw.sendMediaGroup({
      chat_id,
      media,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання точки на карті.
   * У разі успіху повертається надіслане повідомлення.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param latitude Широта
   * @param longitude Довгота
   * @param options Додаткові параметри геолокації
   * @returns `Message` у разі успіху
   */
  public async sendLocation(chat_id: string | number, latitude: number, longitude: number, options?: Omit<SendLocationParams, 'chat_id' | 'latitude' | 'longitude'>): Promise<Message> {
    return this.client.raw.sendLocation({
      chat_id,
      latitude,
      longitude,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання інформації про місце проведення.
   * У разі успіху повертається надіслане повідомлення.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param latitude Широта
   * @param longitude Довгота
   * @param title Назва закладу
   * @param address Адреса
   * @param options Додаткові параметри місця
   * @returns `Message` у разі успіху
   */
  public async sendVenue(chat_id: string | number, latitude: number, longitude: number, title: string, address: string, options?: Omit<SendVenueParams, 'chat_id' | 'latitude' | 'longitude' | 'title' | 'address'>): Promise<Message> {
    return this.client.raw.sendVenue({
      chat_id,
      latitude,
      longitude,
      title,
      address,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання контактної інформації користувача.
   * У разі успіху повертається надіслане повідомлення.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param phone_number Номер телефону
   * @param first_name Ім'я контакту
   * @param options Додаткові параметри контакту
   * @returns `Message` у разі успіху
   */
  public async sendContact(chat_id: string | number, phone_number: string, first_name: string, options?: Omit<SendContactParams, 'chat_id' | 'phone_number' | 'first_name'>): Promise<Message> {
    return this.client.raw.sendContact({
      chat_id,
      phone_number,
      first_name,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання опитування.
   * У разі успіху повертається надіслане повідомлення.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param question Текст опитування
   * @param poll_options Масив варіантів відповідей
   * @param options Додаткові параметри опитування
   * @returns `Message` у разі успіху
   */
  public async sendPoll(
    chat_id: string | number,
    question: string,
    poll_options: InputPollOption[],
    options?: Omit<SendPollParams, 'chat_id' | 'question' | 'options'>
  ): Promise<Message> {
    return this.client.raw.sendPoll({
      chat_id,
      question,
      options: poll_options,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання контрольного списку від імені підключеного бізнес-акаунта.
   * У разі успіху надіслане повідомлення повертається.
   * 
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param checklist Контрольний список для надсилання
   * @param options Додаткові параметри контрольного списку
   * @returns `Message` у разі успіху
   */
  public async sendChecklist(business_connection_id: string, chat_id: number, checklist: InputChecklist, options?: Omit<SendChecklistParams, 'business_connection_id' | 'chat_id' | 'checklist'>): Promise<Message> {
    return this.client.raw.sendChecklist({
      business_connection_id,
      chat_id,
      checklist,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання анімованого емодзі, який відображатиме випадкове значення.
   * У разі успіху надіслане повідомлення повертається.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param options Додаткові параметри анімованого емодзі
   * @returns `Message` у разі успіху
   */
  public async sendDice(chat_id: string | number, options?: Omit<SendDiceParams, 'chat_id'>): Promise<Message> {
    return this.client.raw.sendDice({
      chat_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для потокової передачі частини повідомлення користувачеві під час його генерації.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param draft_id Унікальний ідентифікатор драфту
   * @param text Текст повідомлення
   * @param options Додаткові параметри драфту
   * @returns `True` у разі успіху
   */
  public async sendMessageDraft(chat_id: number, draft_id: number, options?: Omit<SendMessageDraftParams, 'chat_id' | 'draft_id' | 'text'>): Promise<boolean> {
    return this.client.raw.sendMessageDraft({
      chat_id,
      draft_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод, коли вам потрібно повідомити користувачеві, що щось відбувається на стороні бота.
   * Статус встановлюється на 5 секунд або менше (коли надходить повідомлення від вашого бота, клієнти Telegram очищують його статус введення).
   * Повертає `True` у разі успіху.
   * 
   * **Приклад:** ImageBot потребує певного часу для обробки запиту та завантаження зображення.
   * Замість надсилання текстового повідомлення типу «Отримання зображення, зачекайте…», бот може використовувати `sendChatAction` з `action = 'upload_photo'`.
   * Користувач побачить статус бота «надсилання фото».
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param action Тип дії, що виконується
   * @param options Додаткові параметри дії
   * @returns `True` у разі успіху
   */
  public async sendChatAction(chat_id: string | number, action: ChatAction, options?: Omit<SendChatActionParams, 'chat_id' | 'action'>): Promise<boolean> {
    return this.client.raw.sendChatAction({
      chat_id,
      action,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для зміни вибраних реакцій на повідомлення.
   * На службові повідомлення деяких типів не можна реагувати.
   * Автоматично переслані повідомлення з каналу до його групи обговорення мають ті самі доступні реакції, що й повідомлення в каналі.
   * Боти не можуть використовувати платні реакції.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param message_id Унікальний ідентифікатор повідомлення
   * @param reaction Масив реакцій для встановлення
   * @returns `True` у разі успіху
   */
  public async setMessageReaction(chat_id: string | number, message_id: number, reaction: ReactionType[]): Promise<boolean> {
    return this.client.raw.setMessageReaction({
      chat_id,
      message_id,
      reaction
    });
  }

  /**
   * Використовуйте цей метод для отримання списку фотографій профілю користувача.
   * Повертає об'єкт `UserProfilePhotos` з фотографіями користувача, починаючи з найновішої.
   * 
   * @param user_id Унікальний ідентифікатор цільового користувача
   * @param options Додаткові параметри фотографій профілю
   * @returns `UserProfilePhotos` у разі успіху
   */
  public async getUserProfilePhotos(user_id: number, options?: Omit<GetUserProfilePhotosParams, 'user_id'>): Promise<UserProfilePhotos> {
    return this.client.raw.getUserProfilePhotos({
      user_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання списку аудіо профілю користувача.
   * Повертає об'єкт `UserProfileAudios`.
   * 
   * @param user_id Унікальний ідентифікатор цільового користувача
   * @param options Додаткові параметри аудіо профілю
   * @returns `UserProfileAudios` у разі успіху
   */
  public async getUserProfileAudios(user_id: number, options?: Omit<GetUserProfileAudiosParams, 'user_id'>): Promise<UserProfileAudios> {
    return this.client.raw.getUserProfileAudios({
      user_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для встановлення статусу емодзі користувача.
   * Повертає `True` у разі успіху.
   * 
   * @param user_id Унікальний ідентифікатор цільового користувача
   * @param options Додаткові параметри статусу емодзі
   * @returns `True` у разі успіху
   */
  public async setUserEmojiStatus(user_id: number, options?: Omit<SetUserEmojiStatusParams, 'user_id'>): Promise<boolean> {
    return this.client.raw.setUserEmojiStatus({
      user_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання основної інформації про файл та підготовки його до завантаження.
   * Наразі боти можуть завантажувати файли розміром до 20 МБ.
   * У разі успіху повертається об'єкт `TelegramFile`.
   * Файл можна завантажити за посиланням `https://api.telegram.org/file/bot/`, де `file_path` береться з відповіді.
   * Гарантується, що посилання буде дійсним протягом щонайменше 1 години.
   * Після закінчення терміну дії посилання можна запросити нове, знову викликавши `getFile`.
   * 
   * @param file_id Унікальний ідентифікатор файлу
   * @returns `TelegramFile` з інформацією про файл
   */
  public async getFile(file_id: string): Promise<TelegramFile> {
    return this.client.raw.getFile({ file_id });
  }

  /**
   * Використовуйте цей метод для блокування користувача в групі, супергрупі або каналі.
   * У випадку супергруп і каналів користувач не зможе самостійно повернутися до чату за допомогою посилань-запрошень тощо, якщо його попередньо не розбанити.
   * Щоб це спрацювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param user_id Унікальний ідентифікатор цільового користувача
   * @param options Додаткові параметри блокування
   * @returns `true` у разі успіху
   */
  public async banChatMember(chat_id: string | number, user_id: number, options?: Omit<BanChatMemberParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.banChatMember({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб розбанити раніше забаненого користувача в супергрупі або каналі.
   * Користувач **не повернеться** до групи або каналу **автоматично**, але **зможе** приєднатися за **посиланням** тощо.
   * Бот повинен бути адміністратором, щоб це працювало.
   * За замовчуванням цей метод гарантує, що після виклику **користувач не буде** учасником чату, але **зможе** до нього приєднатися.
   * Тож, якщо користувач є учасником чату, його **також буде видалено** з чату.
   * Якщо ви цього не хочете, використовуйте параметр `only_if_banned`.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор цільового чату
   * @param user_id Унікальний ідентифікатор цільового користувача
   * @param options Додаткові параметри розблокування
   * @returns `True` у разі успіху
   */
  public async unbanChatMember(chat_id: string | number, user_id: number, options?: Omit<UnbanChatMemberParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.unbanChatMember({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для обмеження доступу користувача в супергрупі.
   * Щоб це працювало, бот повинен бути адміністратором супергрупи та мати відповідні права адміністратора.
   * Передайте `True` для всіх дозволів, щоб зняти обмеження з користувача.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param user_id Унікальний ідентифікатор користувача
   * @param permissions Новий статус прав користувача
   * @param options Додаткові параметри
   * @returns `True` у разі успіху
   */
  public async restrictChatMember(chat_id: string | number, user_id: number, permissions: ChatPermissions, options?: Omit<RestrictChatMemberParams, 'chat_id' | 'user_id' | 'permissions'>): Promise<boolean> {
    return this.client.raw.restrictChatMember({
      chat_id,
      user_id,
      permissions,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для підвищення або зниження рівня користувача в супергрупі чи каналі.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора. 
   * Передайте значення `False` для всіх логічних параметрів, щоб понизити користувача. 
   * У разі успіху повертає значення `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param user_id Унікальний ідентифікатор користувача
   * @param options Додаткові параметри
   * @returns `True` у разі успіху
   */
  public async promoteChatMember(chat_id: string | number, user_id: number, options?: Omit<PromoteChatMemberParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.promoteChatMember({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб встановити власний титул для адміністратора в супергрупі, яку просуває бот.
   * Щоб це спрацювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param user_id Унікальний ідентифікатор користувача
   * @param custom_title Власний заголовок для адміністратора чату
   * @returns `True` у разі успіху
   */
  public async setChatAdministratorCustomTitle(chat_id: string | number, user_id: number, custom_title: string): Promise<boolean> {
    return this.client.raw.setChatAdministratorCustomTitle({
      chat_id,
      user_id,
      custom_title
    });
  }

  /**
   * Використовуйте цей метод, щоб встановити тег для звичайного учасника групи або супергрупи.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_tags`.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param user_id Унікальний ідентифікатор користувача
   * @param options Додаткові параметри
   * @returns `True` у разі успіху
   */
  public async setChatMemberTag(chat_id: string | number, user_id: number, options?: Omit<SetChatMemberTagParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.setChatMemberTag({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб забанити чат каналу в супергрупі або каналі. 
   * Доки чат не буде розбанено, власник забаненого чату не зможе надсилати повідомлення від імені жодного зі своїх каналів.
   * Щоб це працювало, бот повинен бути адміністратором супергрупи або каналу та мати відповідні права адміністратора.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param sender_chat_id Унікальний ідентифікатор відправника
   * @returns `True` у разі успіху
   */
  public async banChatSenderChat(chat_id: string | number, sender_chat_id: number): Promise<boolean> {
    return this.client.raw.banChatSenderChat({
      chat_id,
      sender_chat_id
    });
  }

  /**
   * Використовуйте цей метод, щоб розблокувати раніше заблокований чат каналу в супергрупі або каналі.
   * Щоб це спрацювало, бот повинен бути адміністратором і мати відповідні права адміністратора.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param sender_chat_id Унікальний ідентифікатор відправника
   * @returns `True` у разі успіху
   */
  public async unbanChatSenderChat(chat_id: string | number, sender_chat_id: number): Promise<boolean> {
    return this.client.raw.unbanChatSenderChat({
      chat_id,
      sender_chat_id
    });
  }

  /**
   * Використовуйте цей метод, щоб встановити дозволи чату за замовчуванням для всіх учасників.
   * Щоб це працювало, бот повинен бути адміністратором групи або супергрупи та мати права адміністратора `can_restrict_members`.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param permissions Новий статус прав користувачів
   * @returns `True` у разі успіху
   */
  public async setChatPermissions(chat_id: string | number, permissions: ChatPermissions, options?: Omit<SetChatPermissionsParams, 'chat_id' | 'permissions'>): Promise<boolean> {
    return this.client.raw.setChatPermissions({
      chat_id,
      permissions,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для створення нового основного посилання-запрошення для чату; будь-яке раніше створене основне посилання буде скасовано.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * У разі успіху повертає нове посилання-запрошення як рядок.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @returns `string` у разі успіху
   */
  public async exportChatInviteLink(chat_id: string | number): Promise<string> {
    return this.client.raw.exportChatInviteLink({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для створення додаткового посилання-запрошення для чату.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * Посилання можна скасувати за допомогою методу `revokeChatInviteLink`.
   * У разі успіху повертає нове посилання-запрошення як об'єкт `ChatInviteLink`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @returns `ChatInviteLink` у разі успіху
   */
  public async createChatInviteLink(chat_id: string | number, options?: Omit<CreateChatInviteLinkParams, 'chat_id'>): Promise<ChatInviteLink> {
    return this.client.raw.createChatInviteLink({
      chat_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для редагування неосновного посилання-запрошення, створеного ботом.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * У разі успіху повертає відредаговане посилання-запрошення як об'єкт `ChatInviteLink`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param invite_link Посилання-запрошення на чат
   * @param options Параметри для зміни посилання-запрошення
   * @returns `ChatInviteLink` у разі успіху
   */
  public async editChatInviteLink(chat_id: string | number, invite_link: string, options?: Omit<EditChatInviteLinkParams, 'chat_id' | 'invite_link'>): Promise<ChatInviteLink> {
    return this.client.raw.editChatInviteLink({
      chat_id,
      invite_link,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для створення посилання-запрошення на підписку для чату каналу.
   * Бот повинен мати права адміністратора `can_invite_users`.
   * Посилання можна редагувати за допомогою методу `editChatSubscriptionInviteLink` або скасувати за допомогою методу `revokeChatInviteLink`.
   * Повертає нове посилання-запрошення як об'єкт `ChatInviteLink`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param options Параметри для створення посилання-запрошення
   * @returns `ChatInviteLink` у разі успіху
   */
  public async createChatSubscriptionInviteLink(chat_id: string | number, subscription_period: number, subscription_price: number, options?: Omit<CreateChatSubscriptionInviteLinkParams, 'chat_id' | 'subscription_period' | 'subscription_price'>): Promise<ChatInviteLink> {
    return this.client.raw.createChatSubscriptionInviteLink({
      chat_id,
      subscription_period,
      subscription_price,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для редагування посилання-запрошення на підписку, створеного ботом.
   * Бот повинен мати права адміністратора `can_invite_users`.
   * Повертає відредаговане посилання-запрошення як об'єкт `ChatInviteLink`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param invite_link Посилання-запрошення на чат
   * @param options Параметри для редагування посилання-запрошення
   * @returns `ChatInviteLink` у разі успіху
   */
  public async editChatSubscriptionInviteLink(chat_id: string | number, invite_link: string, options?: Omit<EditChatSubscriptionInviteLinkParams, 'chat_id' | 'invite_link'>): Promise<ChatInviteLink> {
    return this.client.raw.editChatSubscriptionInviteLink({
      chat_id,
      invite_link,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для скасування посилання-запрошення, створеного ботом.
   * Якщо основне посилання скасовано, автоматично генерується нове посилання.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * Повертає скасоване посилання-запрошення як об'єкт `ChatInviteLink`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param invite_link Посилання-запрошення на чат
   * @returns `ChatInviteLink` у разі успіху
   */
  public async revokeChatInviteLink(chat_id: string | number, invite_link: string): Promise<ChatInviteLink> {
    return this.client.raw.revokeChatInviteLink({
      chat_id,
      invite_link
    });
  }

  /**
   * Використовуйте цей метод для схвалення запиту на приєднання до чату.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_invite_users`.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param user_id Унікальний ідентифікатор користувача
   * @returns `boolean` у разі успіху
   */
  public async approveChatJoinRequest(chat_id: string | number, user_id: number): Promise<boolean> {
    return this.client.raw.approveChatJoinRequest({
      chat_id,
      user_id
    });
  }

  /**
   * Використовуйте цей метод для відхилення запиту на приєднання до чату.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_invite_users`.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param user_id Унікальний ідентифікатор користувача
   * @returns `boolean` у разі успіху
   */
  public async declineChatJoinRequest(chat_id: string | number, user_id: number): Promise<boolean> {
    return this.client.raw.declineChatJoinRequest({
      chat_id,
      user_id
    });
  }

  /**
   * Використовуйте цей метод для завантаження нової фотографії профілю для чату.
   * Щоб це працювало, бот повинен бути адміністратором чату.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param photo Фотографія для завантаження.
   * @returns `true` у разі успіху
   */
  public async setChatPhoto(chat_id: string | number, photo: InputFile): Promise<boolean> {
    return this.client.raw.setChatPhoto({
      chat_id,
      photo
    });
  }

  /**
   * Використовуйте цей метод для видалення фотографії профілю чату.
   * Щоб це працювало, бот повинен бути адміністратором чату.
   * У разі успіху повертає `true`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @returns `boolean` у разі успіху
   */
  public async deleteChatPhoto(chat_id: string | number): Promise<boolean> {
    return this.client.raw.deleteChatPhoto({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для зміни заголовка чату. Заголовки не можна змінювати для приватних чатів.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм бота
   * @param title Новий заголовок чату
   * @returns `True` у разі успіху
   */
  public async setChatTitle(chat_id: string | number, title: string): Promise<boolean> {
    return this.client.raw.setChatTitle({
      chat_id,
      title
    });
  }

  /**
   * Використовуйте цей метод для зміни опису групи, супергрупи або каналу.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * Повертає `true` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param description Новий опис чату
   * @returns `True` у разі успіху
   */
  public async setChatDescription(chat_id: string | number, description?: string): Promise<boolean> {
    return this.client.raw.setChatDescription({
      chat_id,
      description
    });
  }

  /**
   * Використовуйте цей метод, щоб додати повідомлення до списку закріплених повідомлень у чаті. 
   * У приватних чатах та чатах прямих повідомлень каналу можна закріпити всі повідомлення, що не стосуються служби. 
   * І навпаки, бот повинен бути адміністратором з правом `can_pin_messages` або `can_edit_messages` для закріплення повідомлень у групах та каналах відповідно. 
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_id Ідентифікатор повідомлення для закріплення
   * @returns `True` у разі успіху
   */
  public async pinChatMessage(chat_id: string | number, message_id: number, options?: Omit<PinChatMessageParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.pinChatMessage({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб видалити повідомлення зі списку закріплених повідомлень у чаті.
   * У приватних чатах та чатах прямих повідомлень каналу всі повідомлення можна відкріпити.
   * І навпаки, бот повинен бути адміністратором з правом `can_pin_messages` або `can_edit_messages` для відкріплення повідомлень у групах та каналах відповідно.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_id Ідентифікатор повідомлення для видалення
   * @returns `True` у разі успіху
   */
  public async unpinChatMessage(chat_id: string | number, options?: Omit<UnpinChatMessageParams, 'chat_id'>): Promise<boolean> {
    return this.client.raw.unpinChatMessage({
      chat_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб очистити список закріплених повідомлень у чаті.
   * У приватних чатах та чатах прямих повідомлень каналу додаткові права не потрібні для відкріплення всіх закріплених повідомлень.
   * І навпаки, бот повинен бути адміністратором з правом `can_pin_messages` або `can_edit_messages` для відкріплення всіх закріплених повідомлень у групах та каналах відповідно.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async unpinAllChatMessages(chat_id: string | number): Promise<boolean> {
    return this.client.raw.unpinAllChatMessages({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод, щоб ваш бот міг залишити групу, супергрупу або канал.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async leaveChat(chat_id: string | number): Promise<boolean> {
    return this.client.raw.leaveChat({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для отримання актуальної інформації про чат.
   * Повертає об'єкт `ChatFullInfo` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `ChatFullInfo` у разі успіху
   */
  public async getChat(chat_id: string | number): Promise<ChatFullInfo> {
    return this.client.raw.getChat({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для отримання списку адміністраторів у чаті, які не є ботами.
   * Повертає масив об'єктів `ChatMember` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param options Додаткові параметри
   * @returns `ChatMember[]` у разі успіху
   */
  public async getChatAdministrators(chat_id: string | number, options?: Omit<GetChatAdministratorsParams, 'chat_id'>): Promise<ChatMember[]> {
    return this.client.raw.getChatAdministrators({
      chat_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання кількості учасників чату.
   * Повертає `int` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `int` у разі успіху
   */
  public async getChatMemberCount(chat_id: string | number): Promise<number> {
    return this.client.raw.getChatMemberCount({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для отримання інформації про учасника чату.
   * Метод гарантовано працюватиме для інших користувачів лише в тому випадку, якщо бот є адміністратором у чаті.
   * Повертає об'єкт `ChatMember` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param user_id Ідентифікатор користувача
   * @returns `ChatMember` у разі успіху
   */
  public async getChatMember(chat_id: string | number, user_id: number): Promise<ChatMember> {
    return this.client.raw.getChatMember({
      chat_id,
      user_id
    });
  }

  /**
   * Використовуйте цей метод для встановлення нового набору групових стікерів для супергрупи.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * Використовуйте поле `can_set_sticker_set`, яке необов'язково повертається в запитах `getChat`, щоб перевірити, чи може бот використовувати цей метод.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param sticker_set_name Назва стікер-сету
   * @returns `True` у разі успіху
   */
  public async setChatStickerSet(chat_id: string | number, sticker_set_name: string): Promise<boolean> {
    return this.client.raw.setChatStickerSet({
      chat_id,
      sticker_set_name
    });
  }

  /**
   * Використовуйте цей метод для видалення набору групових стікерів із супергрупи.
   * Щоб це спрацювало, бот повинен бути адміністратором чату та мати відповідні права адміністратора.
   * Використовуйте поле `can_set_sticker_set`, яке необов'язково повертається в запитах `getChat`, щоб перевірити, чи може бот використовувати цей метод.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async deleteChatStickerSet(chat_id: string | number): Promise<boolean> {
    return this.client.raw.deleteChatStickerSet({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для видалення реакції з повідомлення в груповому або супергруповому чаті.
   * Бот повинен мати права адміністратора `can_delete_messages` у чаті.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_id Ідентифікатор повідомлення
   * @param options Додаткові параметри
   * @returns `True` у разі успіху
   */
  public async deleteMessageReaction(chat_id: string | number, message_id: number, options?: Omit<DeleteMessageReactionParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.deleteMessageReaction({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для видалення до 10000 нещодавніх реакцій у груповому або супергруповому чаті, доданому певним користувачем або чатом.
   * Бот повинен мати права адміністратора `can_delete_messages` у чаті.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param options Додаткові параметри
   * @returns `True` у разі успіху
   */
  public async deleteAllMessageReactions(chat_id: number | string, options?: Omit<DeleteAllMessageReactionsParams, 'chat_id'>): Promise<boolean> {
    return this.client.raw.deleteAllMessageReactions({
      chat_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання власних стікерів емодзі, які будь-який користувач може використовувати як значок теми форуму.
   * Не потребує параметрів. Повертає масив об'єктів `Sticker`.
   * 
   * @returns `Sticker[]` у разі успіху
   */
  public async getForumTopicIconStickers(): Promise<Sticker[]> {
    return this.client.raw.getForumTopicIconStickers();
  }

  /**
   * Використовуйте цей метод для створення теми в чаті супергрупи форуму або в приватному чаті з користувачем.
   * У випадку чату супергрупи бот повинен бути адміністратором чату, щоб це працювало, і повинен мати права адміністратора `can_manage_topics`.
   * Повертає інформацію про створену тему як об'єкт `ForumTopic`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param name Назва теми форуму
   * @param icon_emoji Іконка теми форуму
   * @returns `ForumTopic` у разі успіху
   */
  public async createForumTopic(chat_id: string | number, name: string, options?: Omit<CreateForumTopicParams, 'chat_id' | 'name'>): Promise<ForumTopic> {
    return this.client.raw.createForumTopic({
      chat_id,
      name,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для редагування назви та значка теми в чаті супергрупи форуму або в приватному чаті з користувачем.
   * У випадку чату супергрупи бот повинен бути адміністратором чату, щоб це працювало, і повинен мати права адміністратора `can_manage_topics`, якщо він не є автором теми.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_thread_id Ідентифікатор теми форуму
   * @param name Нова назва теми форуму
   * @returns `true` у разі успіху
   */
  public async editForumTopic(chat_id: string | number, message_thread_id: number, options?: Omit<EditForumTopicParams, 'chat_id' | 'message_thread_id'>): Promise<boolean> {
    return this.client.raw.editForumTopic({
      chat_id,
      message_thread_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для закриття відкритої теми в чаті супергрупи форуму.
   * Щоб це спрацювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_topics`, якщо він не є автором теми.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_thread_id Ідентифікатор теми форуму
   * @returns `True` у разі успіху
   */
  public async closeForumTopic(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.closeForumTopic({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Використовуйте цей метод, щоб знову відкрити закриту тему в чаті супергрупи форуму.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_topics`, якщо він не є автором теми.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_thread_id Ідентифікатор теми форуму
   * @returns `True` у разі успіху
   */
  public async reopenForumTopic(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.reopenForumTopic({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Використовуйте цей метод для видалення теми форуму разом з усіма її повідомленнями в чаті супергрупи форуму або в приватному чаті з користувачем. 
   * У випадку чату супергрупи бот повинен бути адміністратором чату, щоб це працювало, і повинен мати права адміністратора `can_delete_messages`. 
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_thread_id Ідентифікатор теми форуму
   * @returns `True` у разі успіху
   */
  public async deleteForumTopic(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.deleteForumTopic({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Використовуйте цей метод для очищення списку закріплених повідомлень у темі форуму в чаті супергрупи форуму або в приватному чаті з користувачем. 
   * У випадку чату супергрупи бот повинен бути адміністратором чату, щоб це працювало, і повинен мати права адміністратора `can_pin_messages` у супергрупі. 
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param message_thread_id Ідентифікатор теми форуму
   * @returns `True` у разі успіху
   */
  public async unpinAllForumTopicMessages(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.unpinAllForumTopicMessages({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Використовуйте цей метод для редагування назви теми «Загальне» в чаті супергрупи форуму.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_topics`.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param name Нова назва теми форуму
   * @returns `True` у разі успіху
   */
  public async editGeneralForumTopic(chat_id: string | number, name: string): Promise<boolean> {
    return this.client.raw.editGeneralForumTopic({
      chat_id,
      name
    });
  }

  /**
   * Використовуйте цей метод, щоб закрити відкриту тему «Загальне» в чаті супергрупи форуму.
   * Щоб це спрацювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_topics`.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async closeGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.closeGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод, щоб знову відкрити закриту тему «Загальне» в чаті супергрупи форуму.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_topics`.
   * Тема буде автоматично відображена, якщо вона була прихована.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async reopenGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.reopenGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод, щоб приховати тему «Загальне» в чаті супергрупи форуму.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_topics`.
   * Тема буде автоматично закрита, якщо вона була відкрита.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async hideGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.hideGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод, щоб відобразити тему «Загальне» в чаті супергрупи форуму.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_manage_topics`.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async unhideGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.unhideGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для очищення списку закріплених повідомлень у темі загального форуму.
   * Щоб це працювало, бот повинен бути адміністратором чату та мати права адміністратора `can_pin_messages` у супергрупі.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @returns `True` у разі успіху
   */
  public async unpinAllGeneralForumTopicMessages(chat_id: string | number): Promise<boolean> {
    return this.client.raw.unpinAllGeneralForumTopicMessages({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для надсилання відповідей на запити зворотного виклику, надіслані з вбудованих клавіатур.
   * Відповідь буде відображена користувачеві як сповіщення у верхній частині екрана чату або як сповіщення.
   * У разі успіху повертається значення `True`.
   * 
   * Або ж користувача можна перенаправити на вказану URL-адресу гри.
   * Щоб ця опція працювала, спочатку потрібно створити гру для свого бота через @BotFather та прийняти умови.
   * В іншому випадку ви можете використовувати посилання типу `t.me/your_bot?start=XXXX`, які відкривають вашого бота з параметром.
   * 
   * @param callback_query_id Унікальний ідентифікатор запиту
   * @param options Додаткові параметри відповіді (text, show_alert, url тощо)
   * @returns `True` у разі успіху
   */
  public async answerCallbackQuery(callback_query_id: string, options?: Omit<AnswerCallbackQueryParams, 'callback_query_id'>): Promise<boolean> {
    return this.client.raw.answerCallbackQuery({
      callback_query_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для відповіді на отримане гостеве повідомлення. 
   * У разі успіху повертається об'єкт `SentGuestMessage`.
   * 
   * @param guest_query_id Унікальний ідентифікатор запиту
   * @param result Серіалізований JSON об'єкт, що описує повідомлення, яке потрібно надіслати.
   * @returns `SentGuestMessage`
   */
  public async answerGuestQuery(guest_query_id: string, result: InlineQueryResult): Promise<SentGuestMessage> {
    return this.client.raw.answerGuestQuery({
      guest_query_id,
      result
    });
  }

  /**
   * Використовуйте цей метод, щоб отримати інформацію про бусти, надані користувачем чату.
   * У разі успіху повертає `UserChatBoosts`.
   * 
   * @param chat_id Унікальний ідентифікатор чату або юзернейм каналу/супергрупи
   * @param user_id Унікальний ідентифікатор користувача
   * @returns `UserChatBoosts`
   */
  public async getUserChatBoosts(chat_id: string | number, user_id: number): Promise<UserChatBoosts> {
    return this.client.raw.getUserChatBoosts({
      chat_id,
      user_id
    });
  }

  /**
   * Використовуйте цей метод для отримання інформації про підключення бота до бізнес-акаунта.
   * Повертає об'єкт `BusinessConnection` у разі успіху.
   * 
   * @param business_connection_id Унікальний ідентифікатор бізнес-підключення
   * @returns `BusinessConnection` з інформацією про підключення
   */
  public async getBusinessConnection(business_connection_id: string): Promise<BusinessConnection> {
    return this.client.raw.getBusinessConnection({
      business_connection_id
    });
  }

  /**
   * Використовуйте цей метод для отримання токена керованого бота.
   * У разі успіху повертає токен у вигляді рядка.
   * 
   * @param user_id Унікальний ідентифікатор користувача (керованого бота)
   * @returns `string` токен у вигляді рядка
   */
  public async getManagedBotToken(user_id: number): Promise<string> {
    return this.client.raw.getManagedBotToken({
      user_id
    });
  }

  /**
   * Використовуйте цей метод для скасування поточного токена керованого бота та створення нового.
   * Повертає новий токен як рядок у разі успіху.
   * 
   * @param user_id Унікальний ідентифікатор користувача (керованого бота)
   * @returns Новий токен у вигляді рядка
   */
  public async replaceManagedBotToken(user_id: number): Promise<string> {
    return this.client.raw.replaceManagedBotToken({
      user_id
    });
  }

  /**
   * Використовуйте цей метод для отримання налаштувань доступу керованого бота.
   * Повертає об'єкт `BotAccessSettings` у разі успіху.
   * 
   * @param user_id Унікальний ідентифікатор користувача (керованого бота)
   * @returns `BotAccessSettings` з налаштуваннями доступу
   */
  public async getManagedBotAccessSettings(user_id: number): Promise<BotAccessSettings> {
    return this.client.raw.getManagedBotAccessSettings({
      user_id
    });
  }

  /**
   * Використовуйте цей метод для зміни налаштувань доступу керованого бота.
   * Повертає `True` у разі успіху.
   * 
   * @param user_id Унікальний ідентифікатор користувача (керованого бота)
   * @param is_access_restricted Значення `True`, якщо доступ до бота мають лише вибрані користувачі. Власник бота завжди має до нього доступ.
   * @param options Додаткові параметри (див. `SetManagedBotAccessSettingsParams`)
   * @returns `True` у разі успіху
   */
  public async setManagedBotAccessSettings(user_id: number, is_access_restricted: boolean, options?: Omit<SetManagedBotAccessSettingsParams, 'user_id' | 'is_access_restricted'>): Promise<boolean> {
    return this.client.raw.setManagedBotAccessSettings({
      user_id,
      is_access_restricted,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання останніх повідомлень з особистого чату заданого користувача.
   * У разі успіху повертається масив об'єктів `Message`.
   * 
   * @param user_id Унікальний ідентифікатор користувача
   * @param limit Максимальна кількість повідомлень, які потрібно повернути; 1-20
   * @returns Масив об'єктів `Message`
   */
  public async getUserPersonalChatMessages(user_id: number, limit: number): Promise<Message[]> {
    return this.client.raw.getUserPersonalChatMessages({
      user_id,
      limit
    });
  }

  /**
   * Використовуйте цей метод для зміни списку команд бота.
   * Дивіться цей [посібник](https://core.telegram.org/bots/features#commands) для отримання додаткової інформації про команди бота.
   * Повертає `True` у разі успіху.
   * 
   * @param commands Список команд для бота (макс. 100)
   * @param options Додаткові параметри (scope, language_code)
   * @returns `True` у разі успіху
   */
  public async setMyCommands(commands: BotCommand[], options?: Omit<SetMyCommandsParams, 'commands'>): Promise<boolean> {
    return this.client.raw.setMyCommands({
      commands,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для видалення списку команд бота для заданої області дії та мови користувача.
   * Після видалення [команди вищого рівня](https://core.telegram.org/bots/api#determining-list-of-commands) будуть показані користувачам, яких це стосується.
   * Повертає `True` у разі успіху.
   * 
   * @param options Додаткові параметри (scope, language_code)
   * @returns `True` у разі успіху
   */
  public async deleteMyCommands(options?: DeleteMyCommandsParams): Promise<boolean> {
    return this.client.raw.deleteMyCommands({
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання поточного списку команд бота для заданої області видимості та мови користувача.
   * Повертає масив об'єктів [BotCommand](https://core.telegram.org/bots/api#botcommand).
   * Якщо команди не встановлені, повертається порожній список.
   * 
   * @param options Додаткові параметри (scope, language_code)
   * @returns Масив об'єктів [BotCommand](https://core.telegram.org/bots/api#botcommand)
   */
  public async getMyCommands(options?: GetMyCommandsParams): Promise<BotCommand[]> {
    return this.client.raw.getMyCommands({
      ...options
    });
  }

  /**
   * Використовуйте цей метод для зміни імені бота.
   * Повертає `True` у разі успіху.
   * 
   * @param options Додаткові параметри (name, language_code)
   * @returns `True` у разі успіху
   */
  public async setMyName(options?: SetMyNameParams): Promise<boolean> {
    return this.client.raw.setMyName({
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб отримати поточну назву бота для заданої мови користувача.
   * Повертає [BotName](https://core.telegram.org/bots/api#botname) у разі успіху.
   * 
   * @param options Додаткові параметри (`language_code`)
   * @returns Об'єкт `BotName` у разі успіху
   */
  public async getMyName(options?: GetMyNameParams): Promise<BotName> {
    return this.client.raw.getMyName({
      ...options
    });
  }

  /**
   * Використовуйте цей метод для зміни опису бота, який відображається в чаті з ботом, якщо чат порожній.
   * Повертає `True` у разі успіху.
   * 
   * @param options Додаткові параметри (description, language_code)
   * @returns `True` у разі успіху
   */
  public async setMyDescription(options?: SetMyDescriptionParams): Promise<boolean> {
    return this.client.raw.setMyDescription({
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання поточного опису бота для заданої мови користувача.
   * Повертає `BotDescription` у разі успіху.
   * 
   * @param options Додаткові параметри (`language_code`)
   * @returns Об'єкт `BotDescription` у разі успіху
   */
  public async getMyDescription(options?: GetMyDescriptionParams): Promise<BotDescription> {
    return this.client.raw.getMyDescription({
      ...options
    });
  }

  /**
   * Використовуйте цей метод для зміни короткого опису бота, який відображається на сторінці профілю бота та надсилається разом із посиланням, коли користувачі діляться ботом.
   * Повертає `True` у разі успіху.
   * 
   * @param options Додаткові параметри (short_description, language_code)
   * @returns `True` у разі успіху
   */
  public async setMyShortDescription(options?: SetMyShortDescriptionParams): Promise<boolean> {
    return this.client.raw.setMyShortDescription({
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання поточного короткого опису бота для заданої мови користувача.
   * Повертає `BotShortDescription` у разі успіху.
   * 
   * @param options Додаткові параметри (`language_code`)
   * @returns Об'єкт `BotShortDescription` у разі успіху
   */
  public async getMyShortDescription(options?: GetMyShortDescriptionParams): Promise<BotShortDescription> {
    return this.client.raw.getMyShortDescription({
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб змінити фотографію профілю бота.
   * Повертає `True` у разі успіху.
   * 
   * @param photo Фотографію профілю бота
   * @returns `True` у разі успіху
   */
  public async setMyProfilePhoto(photo: InputProfilePhoto): Promise<boolean> {
    return this.client.raw.setMyProfilePhoto({
      photo
    });
  }

  /**
   * Використовуйте цей метод, щоб видалити фотографію профілю бота.
   * Повертає `True` у разі успіху.
   * 
   * @returns `True` у разі успіху
   */
  public async removeMyProfilePhoto(): Promise<boolean> {
    return this.client.raw.removeMyProfilePhoto();
  }

  /**
   * Використовуйте цей метод, щоб змінити кнопку меню бота в приватному чаті або кнопку меню за замовчуванням.
   * Повертає `True` у разі успіху.
   * 
   * @param options Додаткові параметри (chat_id, menu_button)
   * @returns `True` у разі успіху
   */
  public async setChatMenuButton(options?: SetChatMenuButtonParams): Promise<boolean> {
    return this.client.raw.setChatMenuButton({
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб отримати поточне значення кнопки меню бота в приватному чаті або кнопки меню за замовчуванням.
   * Повертає `MenuButton` у разі успіху.
   * 
   * @param chat_id Ідентифікатор чату
   * @returns Об'єкт `MenuButton` у разі успіху
   */
  public async getChatMenuButton(chat_id?: number): Promise<MenuButton> {
    return this.client.raw.getChatMenuButton({
      chat_id
    });
  }

  /**
   * Використовуйте цей метод для зміни прав адміністратора за замовчуванням, які запитує бот, коли його додають як адміністратора до груп або каналів.
   * Ці права будуть запропоновані користувачам, але вони можуть змінити список перед додаванням бота.
   * Повертає `True` у разі успіху.
   * 
   * @param options Додаткові параметри (rights, for_channels)
   * @returns `True` у разі успіху
   */
  public async setMyDefaultAdministratorRights(options?: SetMyDefaultAdministratorRightsParams): Promise<boolean> {
    return this.client.raw.setMyDefaultAdministratorRights({
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб отримати поточні права адміністратора бота за замовчуванням.
   * У разі успіху повертає `ChatAdministratorRights`.
   * 
   * @param options Додаткові параметри (for_channels)
   * @returns Об'єкт `ChatAdministratorRights` у разі успіху
   */
  public async getMyDefaultAdministratorRights(options?: GetMyDefaultAdministratorRightsParams): Promise<ChatAdministratorRights> {
    return this.client.raw.getMyDefaultAdministratorRights({
      ...options
    });
  }

  /**
   * Повертає список подарунків, які бот може надіслати користувачам та чатам каналу.
   * Параметри не потрібні.
   * Повертає об'єкт `Gifts` у разі успіху.
   * 
   * @returns Об'єкт `Gifts` у разі успіху
   */
  public async getAvailableGifts(): Promise<Gifts> {
    return this.client.raw.getAvailableGifts();
  }

  /**
   * Надсилає подарунок вказаному користувачеві або чату каналу.
   * Одержувач не може конвертувати подарунок у зірки Telegram.
   * У разі успіху повертає `True`.
   * 
   * @param gift_id Унікальний ідентифікатор подарунка
   * @param options Додаткові параметри (chat_id, gift_item_name, user_id)
   * @returns `True` у разі успіху
   */
  public async sendGift(gift_id: string, options: Omit<SendGiftParams, "gift_id">): Promise<boolean> {
    return this.client.raw.sendGift({
      gift_id,
      ...options
    });
  }

  /**
   * Дарує преміум-підписку на Telegram зазначеному користувачеві.
   * У разі успіху повертає `True`.
   * 
   * @param user_id Ідентифікатор користувача
   * @param month_count Кількість місяців підписки
   * @param star_count Кількість зірок
   * @returns `True` у разі успіху
   */
  public async giftPremiumSubscription(user_id: number, month_count: number, star_count: number, options?: Omit<GiftPremiumSubscriptionParams, "user_id" | "month_count" | "star_count">): Promise<boolean> {
    return this.client.raw.giftPremiumSubscription({
      user_id,
      month_count,
      star_count,
      ...options
    });
  }

  /**
   * Підтверджує користувача [від імені організації](https://telegram.org/verify#third-party-verification), яку представляє бот.
   * Повертає `True` у разі успіху.
   * 
   * @param user_id Ідентифікатор користувача
   * @param options Додаткові параметри (status, comment)
   * @returns `True` у разі успіху
   */
  public async verifyUser(user_id: number, options?: Omit<VerifyUserParams, "user_id">): Promise<boolean> {
    return this.client.raw.verifyUser({
      user_id,
      ...options
    });
  }

  /**
   * Підтверджує чат [від імені організації](https://telegram.org/verify#third-party-verification), яку представляє бот.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Ідентифікатор чату
   * @param options Додаткові параметри (custom_description)
   * @returns `True` у разі успіху
   */
  public async verifyChat(chat_id: number, options?: Omit<VerifyChatParams, "chat_id">): Promise<boolean> {
    return this.client.raw.verifyChat({
      chat_id,
      ...options
    });
  }

  /**
   * Скасовує верифікацію користувача, яку встановив бот [від імені організації](https://telegram.org/verify#third-party-verification).
   * Повертає `True` у разі успіху.
   * 
   * @param user_id Ідентифікатор користувача
   * @returns `true` у разі успіху
   */
  public async removeUserVerification(user_id: number): Promise<boolean> {
    return this.client.raw.removeUserVerification({ user_id });
  }

  /**
   * Скасовує верифікацію чату, яку встановив бот [від імені організації](https://telegram.org/verify#third-party-verification).
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Ідентифікатор чату
   * @returns `True` у разі успіху
   */
  public async removeChatVerification(chat_id: string | number): Promise<boolean> {
    return this.client.raw.removeChatVerification({
      chat_id
    });
  }

  /**
   * Позначає вхідне повідомлення як прочитане від імені бізнес-акаунта.
   * Потрібне право бізнес-бота `can_read_messages`.
   * Повертає `True` у разі успіху.
   * 
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param chat_id Ідентифікатор чату
   * @param message_id Ідентифікатор повідомлення
   * @returns `True` у разі успіху
   */
  public async readBusinessMessage(business_connection_id: string, chat_id: number, message_id: number): Promise<boolean> {
    return this.client.raw.readBusinessMessage({
      business_connection_id,
      chat_id,
      message_id
    });
  }

  /**
   * Видалення повідомлень від імені бізнес-акаунта.
   * Потрібне право бізнес-бота `can_delete_sent_messages` для видалення повідомлень, надісланих самим ботом, або право бізнес-бота `can_delete_all_messages` для видалення будь-якого повідомлення.
   * Повертає `True` у разі успіху.
   * 
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param message_ids Ідентифікатори повідомлень
   * @returns `True` у разі успіху
   */
  public async deleteBusinessMessages(business_connection_id: string, message_ids: number[]): Promise<boolean> {
    return this.client.raw.deleteBusinessMessages({
      business_connection_id,
      message_ids
    });
  }

  /**
   * Змінює ім'я та прізвище керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_change_name`.
   * Повертає `True` у разі успіху.
   * 
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param first_name Нове ім'я керованого бізнес-акаунта
   * @param options Додаткові параметри (last_name)
   * @returns `True` у разі успіху
   */
  public async setBusinessAccountName(business_connection_id: string, first_name: string, options?: Omit<SetBusinessAccountNameParams, "business_connection_id" | "first_name">): Promise<boolean> {
    return this.client.raw.setBusinessAccountName({
      business_connection_id,
      first_name,
      ...options
    });
  }

  /**
   * Змінює ім'я користувача керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_change_username`. 
   * У разі успіху повертає `True`.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param options Додаткові параметри (username)
   * @returns `True` у разі успіху
   */
  public async setBusinessAccountUsername(business_connection_id: string, options?: Omit<SetBusinessAccountUsernameParams, "business_connection_id">): Promise<boolean> {
    return this.client.raw.setBusinessAccountUsername({
      business_connection_id,
      ...options
    });
  }

  /**
   * Змінює біографію керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_change_bio`.
   * Повертає `True` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param options Додаткові параметри (bio)
   * @returns `True` у разі успіху
   */
  public async setBusinessAccountBio(business_connection_id: string, options?: Omit<SetBusinessAccountBioParams, "business_connection_id">): Promise<boolean> {
    return this.client.raw.setBusinessAccountBio({
      business_connection_id,
      ...options
    });
  }

  /**
   * Змінює фотографію профілю керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_edit_profile_photo`.
   * Повертає `True` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param photo Фотографію керованого бізнес-акаунта
   * @param options Додаткові параметри (photo)
   * @returns `True` у разі успіху
   */
  public async setBusinessAccountProfilePhoto(business_connection_id: string, photo: InputProfilePhoto, options?: Omit<SetBusinessAccountProfilePhotoParams, "business_connection_id" | "photo">): Promise<boolean> {
    return this.client.raw.setBusinessAccountProfilePhoto({
      business_connection_id,
      photo,
      ...options
    });
  }

  /**
   * Видаляє поточну фотографію профілю керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_edit_profile_photo`.
   * Повертає `True` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @returns `True` у разі успіху
   */
  public async removeBusinessAccountProfilePhoto(business_connection_id: string, options?: Omit<RemoveBusinessAccountProfilePhotoParams, "business_connection_id">): Promise<boolean> {
    return this.client.raw.removeBusinessAccountProfilePhoto({
      business_connection_id,
      ...options
    });
  }

  /**
   * Змінює налаштування конфіденційності, що стосуються вхідних подарунків у керованому бізнес-акаунті.
   * Потрібне право бізнес-бота `can_change_gift_settings`.
   * Повертає `True` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param show_gift_button Показувати кнопку подарунка
   * @param accepted_gift_types Типи подарунків, що приймаються
   * @returns `True` у разі успіху
   */
  public async setBusinessAccountGiftSettings(business_connection_id: string, show_gift_button: boolean, accepted_gift_types: AcceptedGiftTypes): Promise<boolean> {
    return this.client.raw.setBusinessAccountGiftSettings({
      business_connection_id,
      show_gift_button,
      accepted_gift_types
    });
  }

  /**
   * Повертає кількість зірок Telegram, що належать керованому бізнес-акаунту.
   * Потрібне право бізнес-бота `can_view_gifts_and_stars`.
   * Повертає `StarAmount` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @returns Кількість зірок
   */
  public async getBusinessAccountStarBalance(business_connection_id: string): Promise<StarAmount> {
    return this.client.raw.getBusinessAccountStarBalance({
      business_connection_id
    });
  }

  /**
   * Переводить Telegram Stars з балансу бізнес-акаунту на баланс бота.
   * Потрібне право бізнес-бота `can_transfer_stars`.
   * Повертає `True` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param star_count Кількість зірок для переказу
   * @returns `True` у разі успіху
   */
  public async transferBusinessAccountStars(business_connection_id: string, star_count: number): Promise<boolean> {
    return this.client.raw.transferBusinessAccountStars({
      business_connection_id,
      star_count
    });
  }

  /**
   * Повертає отримані подарунки, що належать керованому бізнес-акаунту.
   * Потрібне право бізнес-бота `can_view_gifts_and_stars`.
   * Повертає `OwnedGifts` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param options Додаткові параметри
   * @returns Отримані подарунки
   */
  public async getBusinessAccountGifts(business_connection_id: string, options?: Omit<GetBusinessAccountGiftsParams, "business_connection_id">): Promise<OwnedGifts> {
    return this.client.raw.getBusinessAccountGifts({
      business_connection_id,
      ...options
    });
  }

  /**
   * Повертає подарунки, що належать та розміщені користувачем.
   * Повертає `OwnedGifts` у разі успіху.
   *
   * @param user_id Ідентифікатор користувача
   * @param options Додаткові параметри
   * @returns Отримані подарунки
   */
  public async getUserGifts(user_id: number, options?: Omit<GetUserGiftsParams, "user_id">): Promise<OwnedGifts> {
    return this.client.raw.getUserGifts({
      user_id,
      ...options
    });
  }

  /**
   * Повертає подарунки, що належать чату.
   * Повертає `OwnedGifts` у разі успіху.
   *
   * @param chat_id Ідентифікатор чату з користувачем
   * @param options Додаткові параметри
   * @returns Отримані подарунки
   */
  public async getChatGifts(chat_id: number | string, options?: Omit<GetChatGiftsParams, "chat_id">): Promise<OwnedGifts> {
    return this.client.raw.getChatGifts({
      chat_id,
      ...options
    });
  }

  /**
   * Перетворює звичайний подарунок на зірки Telegram.
   * Потрібно активувати бізнес-бота `can_convert_gifts_to_stars`.
   * У разі успіху повертає `True`.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param owned_gift_id Ідентифікатор подарунка
   * @returns `True` у разі успіху
   */
  public async convertGiftToStars(business_connection_id: string, owned_gift_id: string): Promise<boolean> {
    return this.client.raw.convertGiftToStars({
      business_connection_id,
      owned_gift_id
    });
  }

  /**
   * Покращує звичайний подарунок до унікального.
   * Потрібне право бізнес-бота `can_transfer_and_upgrade_gifts`.
   * Додатково потрібне право бізнес-бота `can_transfer_stars`, якщо покращення оплачене.
   * Повертає `True` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param owned_gift_id Ідентифікатор подарунка
   * @returns `True` у разі успіху
   */
  public async upgradeGift(business_connection_id: string, owned_gift_id: string, options?: Omit<UpgradeGiftParams, "business_connection_id" | "owned_gift_id">): Promise<boolean> {
    return this.client.raw.upgradeGift({
      business_connection_id,
      owned_gift_id,
      ...options
    });
  }

  /**
   * Передає власний унікальний подарунок іншому користувачеві.
   * Потрібне право бізнес-бота `can_transfer_and_upgrade_gifts`.
   * Потрібне право бізнес-бота `can_transfer_stars`, якщо передача оплачена.
   * Повертає `True` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта
   * @param owned_gift_id Ідентифікатор подарунка
   * @param new_owner_chat_id Ідентифікатор чату нового власника
   * @param options Додаткові параметри
   * @returns `True` у разі успіху
   */
  public async transferGift(business_connection_id: string, owned_gift_id: string, new_owner_chat_id: number, options?: Omit<TransferGiftParams, "business_connection_id" | "owned_gift_id" | "new_owner_chat_id">): Promise<boolean> {
    return this.client.raw.transferGift({
      business_connection_id,
      owned_gift_id,
      new_owner_chat_id,
      ...options
    });
  }

  /**
   * Публікує історію від імені керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_manage_stories`.
   * Повертає `Story` у разі успіху.
   *  
   * @param business_connection_id Унікальний ідентифікатор ділового зв'язку
   * @param content Вміст сторіз
   * @param active_period Тривалість сторіз (від 1 до 72 годин)
   * @param options Додаткові параметри
   * @returns `Story` у разі успіху
   */
  public async postStory(business_connection_id: string, content: InputStoryContent, active_period: number, options?: Omit<PostStoryParams, "business_connection_id" | "content" | "active_period">): Promise<Story> {
    return this.client.raw.postStory({
      business_connection_id,
      content,
      active_period,
      ...options
    });
  }

  /**
   * Репостить історію від імені бізнес-акаунта з іншого бізнес-акаунта.
   * Обидва бізнес-акаунти повинні керуватися одним ботом, а історія у вихідному обліковому записі повинна бути опублікована (або репостнута) ботом.
   * Потрібне право бізнес-бота `can_manage_stories` для обох бізнес-акаунтів.
   * Повертає `Story` у разі успіху.
   *
   * @param business_connection_id Ідентифікатор бізнес-акаунта.
   * @param story_link Посилання на story.
   * @param options Додаткові параметри.
   * @returns `Story` у разі успіху.
   */
  public async repostStory(business_connection_id: string, from_chat_id: number, from_story_id: number, active_period: number, options?: Omit<RepostStoryParams, "business_connection_id" | "from_chat_id" | "from_story_id" | "active_period">): Promise<Story> {
    return this.client.raw.repostStory({
      business_connection_id,
      from_chat_id,
      from_story_id,
      active_period,
      ...options
    });
  }

  /**
   * Редагує історію, попередньо опубліковану ботом від імені керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_manage_stories`.
   * Повертає `Story` у разі успіху.
   *
   * @param business_connection_id Унікальний ідентифікатор ділового зв'язку
   * @param story_id Ідентифікатор сторіз
   * @param content Вміст сторіз
   * @param options Додаткові параметри
   * @returns `Story` у разі успіху
   */
  public async editStory(business_connection_id: string, story_id: number, content: InputStoryContent, options?: Omit<EditStoryParams, "business_connection_id" | "story_id" | "content">): Promise<Story> {
    return this.client.raw.editStory({
      business_connection_id,
      story_id,
      content,
      ...options
    });
  }

  /**
   * Видаляє історію, попередньо опубліковану ботом від імені керованого бізнес-акаунта.
   * Потрібне право бізнес-бота `can_manage_stories`.
   * У разі успіху повертає `True`.
   *
   * @param business_connection_id Унікальний ідентифікатор ділового зв'язку
   * @param story_id Ідентифікатор сторіз
   * @returns `True` у разі успіху
   */
  public async deleteStory(business_connection_id: string, story_id: number): Promise<boolean> {
    return this.client.raw.deleteStory({
      business_connection_id,
      story_id
    });
  }

  /**
   * Використовуйте цей метод, щоб встановити результат взаємодії з веб-застосунком і надіслати відповідне повідомлення від імені користувача до чату, з якого походить запит.
   * У разі успіху повертається об'єкт `SentWebAppMessage`.
   * 
   * @param web_app_query_id Ідентифікатор запиту до Web App.
   * @param result Результат взаємодії з веб-застосунком.
   * @returns `SentWebAppMessage`.
   */
  public async answerWebAppQuery(web_app_query_id: string, result: InlineQueryResult): Promise<SentWebAppMessage> {
    return this.client.raw.answerWebAppQuery({
      web_app_query_id,
      result
    });
  }

  /**
 * Зберігає повідомлення, яке може надіслати користувач міні-програми.
 * Повертає об'єкт `PreparedInlineMessage`.
 *
 * @param user_id Ідентифікатор користувача
 * @param result Результат inline-запиту
 * @returns `PreparedInlineMessage` з ID підготовленого повідомлення
 */

  public async savePreparedInlineMessage(user_id: number, result: InlineQueryResult, options?: Omit<SavePreparedInlineMessageParams, 'user_id' | 'result'>): Promise<PreparedInlineMessage> {
    return this.client.raw.savePreparedInlineMessage({
      user_id,
      result,
      ...options
    });
  }

  /**
 * Зберігає кнопку клавіатури, яку може використати користувач міні-програми.
 * Повертає об'єкт `PreparedKeyboardButton`.
 *
 * @param user_id Ідентифікатор користувача
 * @param button Кнопка клавіатури
 * @returns `PreparedKeyboardButton` з ID підготовленої кнопки
 */

  public async savePreparedKeyboardButton(user_id: number, button: KeyboardButton): Promise<PreparedKeyboardButton> {
    return this.client.raw.savePreparedKeyboardButton({
      user_id,
      button
    });
  }

  /**
   * Допоміжний метод для нормалізації ідентифікатора повідомлення при редагуванні.
   */
  private getEditIds(id: { chat_id: number | string; message_id: number } | string) {
    return typeof id === 'string'
      ? { inline_message_id: id }
      : { chat_id: id.chat_id, message_id: id.message_id };
  }



  /**
 * Редагує текстове повідомлення або текст inline-повідомлення.
 *
 * @param id Ідентифікатор повідомлення (або chat_id і message_id, або inline_message_id)
 * @param text Новий текст повідомлення
 * @param options Додаткові параметри
 * @returns Редаговане повідомлення
 */
  public async editMessageText(
    id: EditMessageIds,
    text: string,
    options?: Omit<EditMessageTextParams, 'chat_id' | 'message_id' | 'inline_message_id' | 'text'>
  ): Promise<Message | boolean> {
    return this.client.raw.editMessageText({
      ...this.getEditIds(id),
      text,
      ...options
    });
  }

  /**
 * Використовуйте цей метод для редагування підписів до повідомлень.
 * У разі успіху, якщо відредаговане повідомлення не є вбудованим повідомленням, повертається відредаговане повідомлення, інакше повертається значення `True`.
 * Зверніть увагу, що ділові повідомлення, які не були надіслані ботом і не містять вбудованої клавіатури, можна редагувати лише протягом 48 годин з моменту їх надсилання.
 *
 * @param id Ідентифікатор повідомлення (або chat_id і message_id, або inline_message_id)
 * @param caption Новий підпис (може бути null для видалення)
 * @param options Додаткові параметри
 * @returns Редаговане повідомлення або `True`, якщо редагування було успішним
 */
  public async editMessageCaption(
    id: EditMessageIds,
    options?: Omit<EditMessageCaptionParams, 'chat_id' | 'message_id' | 'inline_message_id'>
  ): Promise<Message | boolean> {
    return this.client.raw.editMessageCaption({
      ...this.getEditIds(id),
      ...options
    });
  }

  /**
   * Використовуйте цей метод для редагування анімації, аудіо, документів, фотографій або відеоповідомлень, або для додавання медіафайлів до текстових повідомлень.
   * Якщо повідомлення є частиною альбому повідомлень, його можна редагувати лише як аудіо для аудіоальбомів, лише як документ для альбомів документів та як фото або відео в інших випадках.
   * Під час редагування вбудованого повідомлення новий файл не можна завантажити; використовуйте раніше завантажений файл через його `file_id` або вкажіть URL-адресу.
   * У разі успіху, якщо відредаговане повідомлення не є вбудованим повідомленням, повертається відредаговане повідомлення, інакше повертається значення `True`.
   * Зверніть увагу, що ділові повідомлення, які не були надіслані ботом і не містять вбудованої клавіатури, можна редагувати лише протягом 48 годин з моменту їх надсилання.
   * 
   * @param id Ідентифікатор повідомлення. Може бути об'єктом з `chat_id` і `message_id` або строкою `inline_message_id`.
   * @param options Параметри редагування медіа-повідомлення. Обов'язково має включати `media` (InputMediaVideo/InputMediaAnimation/InputMediaAudio/InputMediaPhoto).
   * @returns Редаговане повідомлення або `True` у разі успіху.
   */
  public async editMessageMedia(
    id: EditMessageIds,
    media: InputMedia,
    options?: Omit<EditMessageMediaParams, 'chat_id' | 'message_id' | 'inline_message_id' | 'media'>
  ): Promise<Message | boolean> {
    return this.client.raw.editMessageMedia({
      ...this.getEditIds(id),
      media,
      ...options
    });
  }

  /**
 * Використовуйте цей метод для редагування повідомлень про місцезнаходження в реальному часі.
 * Місцезнаходження можна редагувати, доки не закінчиться його `live_period` або редагування не буде явно заборонено викликом `stopMessageLiveLocation`.
 * У разі успіху, якщо відредаговане повідомлення не є вбудованим повідомленням, повертається відредаговане `Message`, інакше повертається `True`.
 * 
 * @param id Ідентифікатор повідомлення. Може бути об'єктом з `chat_id` і `message_id` або строкою `inline_message_id`.
 * @param latitude Нова широта місцезнаходження
 * @param longitude Нова довгота місцезнаходження
 * @param options Додаткові параметри
 * @returns Редаговане повідомлення або `True` у разі успіху.
 */
  public async editMessageLiveLocation(
    id: EditMessageIds,
    latitude: number,
    longitude: number,
    options?: Omit<EditMessageLiveLocationParams, 'chat_id' | 'message_id' | 'inline_message_id' | 'latitude' | 'longitude'>
  ): Promise<Message | boolean> {
    return this.client.raw.editMessageLiveLocation({
      ...this.getEditIds(id),
      latitude,
      longitude,
      ...options
    });
  }

  /**
 * Використовуйте цей метод, щоб зупинити оновлення повідомлення про поточне місцезнаходження до закінчення терміну `live_period`.
 * У разі успіху, якщо повідомлення не є вбудованим, повертається відредаговане повідомлення, інакше повертається значення `True`. 
 * 
 * @param id Ідентифікатор повідомлення. Може бути об'єктом з `chat_id` і `message_id` або строкою `inline_message_id`.
 * @param options Додаткові параметри
 * @returns Відредаговане повідомлення або `True` у разі успіху.
 */

  public async stopMessageLiveLocation(
    id: EditMessageIds,
    options?: Omit<StopMessageLiveLocationParams, 'chat_id' | 'message_id' | 'inline_message_id'>
  ): Promise<Message | boolean> {
    return this.client.raw.stopMessageLiveLocation({
      ...this.getEditIds(id),
      ...options
    });
  }

  /**
   * Використовуйте цей метод для редагування контрольного списку від імені підключеного бізнес-акаунта.
   * У разі успіху повертається відредаговане повідомлення.
   * 
   * @param business_connection_id Ідентифікатор бізнес-з'єднання.
   * @param chat_id Ідентифікатор чату.
   * @param message_id Ідентифікатор повідомлення.
   * @param checklist Новий контрольний список.
   * @param options Додаткові параметри
   * @returns Відредаговане повідомлення у разі успіху.
   */
  public async editMessageChecklist(
    business_connection_id: string,
    chat_id: number,
    message_id: number,
    checklist: InputChecklist,
    options?: Omit<EditMessageChecklistParams, 'business_connection_id' | 'chat_id' | 'message_id' | 'checklist'>
  ): Promise<Message> {
    return this.client.raw.editMessageChecklist({
      business_connection_id,
      chat_id,
      message_id,
      checklist,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для редагування лише розмітки відповідей у ​​повідомленнях.
   * У разі успіху, якщо відредаговане повідомлення не є вбудованим повідомленням, повертається відредаговане повідомлення, інакше повертається значення `True`.
   * Зверніть увагу, що ділові повідомлення, які не були надіслані ботом і не містять вбудованої клавіатури, можна редагувати лише протягом 48 годин з моменту їх надсилання.
   * 
   * @param id Ідентифікатор повідомлення. Може бути об'єктом з `chat_id` і `message_id` або строкою `inline_message_id`.
   * @param options Додаткові параметри.
   * @returns Відредаговане повідомлення або `True` у разі успіху.
   */
  public async editMessageReplyMarkup(
    id: EditMessageIds,
    options?: Omit<EditMessageReplyMarkupParams, 'chat_id' | 'message_id' | 'inline_message_id'>
  ): Promise<Message | boolean> {
    return this.client.raw.editMessageReplyMarkup({
      ...this.getEditIds(id),
      ...options
    });
  }

  /**
   * Використовуйте цей метод для зупинки опитування.
   * У разі успіху повертається оновлене опитування.
   * 
   * @param chat_id Ідентифікатор чату або юзернейм.
   * @param message_id Ідентифікатор повідомлення з опитуванням.
   * @param options Додаткові параметри.
   * @returns Оновлене опитування.
   */
  public async stopPoll(chat_id: number | string, message_id: number, options?: Omit<StopPollParams, 'chat_id' | 'message_id'>): Promise<Poll> {
    return this.client.raw.stopPoll({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для схвалення запропонованого допису в чаті прямих повідомлень.
   * Бот повинен мати права адміністратора `can_post_messages` у відповідному чаті каналу.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Ідентифікатор чату або юзернейм.
   * @param message_id Ідентифікатор запропонованого допису.
   * @returns `True` у разі успіху.
   */
  public async approveSuggestedPost(chat_id: number, message_id: number, options?: Omit<ApproveSuggestedPostParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.approveSuggestedPost({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод, щоб відхилити запропонований допис у чаті прямих повідомлень.
   * Бот повинен мати права адміністратора `can_manage_direct_messages` у відповідному чаті каналу.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Ідентифікатор чату.
   * @param message_id Ідентифікатор запропонованого допису.
   * @returns `True` у разі успіху.
   */
  public async declineSuggestedPost(chat_id: number, message_id: number, options?: Omit<DeclineSuggestedPostParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.declineSuggestedPost({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для видалення повідомлення, включаючи службові повідомлення, з такими обмеженнями:
   * - Повідомлення можна видалити, лише якщо воно було надіслано менше 48 годин тому.
   * - Службові повідомлення про створення супергрупи, каналу або теми на форумі не можна видалити.
   * - Повідомлення `dice` у приватному чаті можна видалити, лише якщо воно було надіслано більше 24 годин тому.
   * - Боти можуть видаляти вихідні повідомлення у приватних чатах, групах та супергрупах.
   * - Боти можуть видаляти вхідні повідомлення у приватних чатах.
   * - Боти, яким надано дозвіл `can_post_messages`, можуть видаляти вихідні повідомлення у каналах.
   * - Якщо бот є адміністратором групи, він може видалити будь-яке повідомлення там.
   * - Якщо бот має права адміністратора `can_delete_messages` у супергрупі або каналі, він може видалити будь-яке повідомлення там.
   * - Якщо бот має права адміністратора `can_manage_direct_messages` у каналі, він може видалити будь-яке повідомлення у відповідному чаті прямих повідомлень.
   * Повертає `True` у разі успіху.
   * 
   * @param chat_id Ідентифікатор чату або юзернейм.
   * @param message_id Ідентифікатор повідомлення.
   * @returns `True` у разі успіху.
   */
  public async deleteMessage(chat_id: number | string, message_id: number): Promise<boolean> {
    return this.client.raw.deleteMessage({
      chat_id,
      message_id,
    });
  }

  /**
   * Використовуйте цей метод для одночасного видалення кількох повідомлень.
   * Якщо деякі з указаних повідомлень не вдається знайти, вони пропускаються.
   * У разі успіху повертає `True`.
   * 
   * @param chat_id Ідентифікатор чату або юзернейм.
   * @param message_ids Ідентифікатори повідомлень.
   * @returns `True` у разі успіху.
   */
  public async deleteMessages(chat_id: number | string, message_ids: number[]): Promise<boolean> {
    return this.client.raw.deleteMessages({
      chat_id,
      message_ids,
    });
  }

  /**
   * Використовуйте цей метод для надсилання статичних стікерів `.WEBP`, анімованих `.TGS` або відео `.WEBM`.
   * У разі успіху повертається надіслане повідомлення.
   * 
   * @param chat_id Ідентифікатор чату або юзернейм.
   * @param sticker Стікер для надсилання. Може бути `file_id`, `url` або `InputFile`.
   * @param options Додаткові параметри.
   * @returns Відправлене повідомлення.
   */
  public async sendSticker(chat_id: number | string, sticker: string | InputFile, options?: Omit<SendStickerParams, 'chat_id' | 'sticker'>): Promise<Message> {
    return this.client.raw.sendSticker({
      chat_id,
      sticker,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання набору стікерів.
   * У разі успіху повертається об'єкт `StickerSet`.
   * 
   * @param name Ім'я стікерсету.
   * @returns `StickerSet`.
   */
  public async getStickerSet(name: string): Promise<StickerSet> {
    return this.client.raw.getStickerSet({ name });
  }

  /**
   * Використовуйте цей метод для отримання інформації про власні стікери емодзі за їхніми ідентифікаторами.
   * Повертає масив об'єктів `Sticker`.
   *

   * @param custom_emoji_ids Ідентифікатори стікерів.
   * @returns Масив об'єктів `Sticker`.
   */
  public async getCustomEmojiStickers(custom_emoji_ids: string[]): Promise<Sticker[]> {
    return this.client.raw.getCustomEmojiStickers({ custom_emoji_ids });
  }

  /**
   * Використовуйте цей метод для завантаження файлу зі стікером для подальшого використання в методах `createNewStickerSet`, `addStickerToSet` або `replaceStickerInSet` (файл можна використовувати кілька разів).
   * Повертає завантажений файл у разі успіху.
   * 
   * @param user_id Ідентифікатор користувача.
   * @param sticker Стікер для завантаження. Може бути `string` (file_id) або `InputFile`.
   * @param sticker_format Формат стікера. Може бути `'static'` або `'animated'` або `'video'`.
   * @returns Об'єкт `File`.
   */
  public async uploadStickerFile(user_id: number, sticker: string | InputFile, sticker_format: 'static' | 'animated' | 'video'): Promise<TelegramFile> {
    return this.client.raw.uploadStickerFile({ user_id, sticker, sticker_format });
  }

  /**
   * Використовуйте цей метод для створення нового набору стікерів, що належить користувачеві.
   * Бот зможе редагувати створений таким чином набір стікерів.
   * Повертає `True` у разі успіху.
   * 
   * @param name Ім'я набору стікерів. Має починатися з символів `a-z`, `A-Z` або `0-9` і може містити `_` та складатися не більше ніж з 64 символів.
   * @param title Назва набору стікерів. Має складатися не більше ніж з 64 символів.
   * @param stickers Масив стікерів для додавання. Потрібно передати хоча б один стікер.
   * @param options Додаткові параметри.
   * @returns `True` у разі успіху.
   */
  public async createNewStickerSet(user_id: number, name: string, title: string, stickers: InputSticker[], options?: Omit<CreateNewStickerSetParams, 'name' | 'title' | 'stickers'>): Promise<boolean> {
    return this.client.raw.createNewStickerSet({
      user_id,
      name,
      title,
      stickers,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для додавання нового стікера до набору стікерів. 
   * У разі успіху повертає `True`.
   * 
   * @param user_id Ідентифікатор користувача, що створює набір стікерів.
   * @param name Ім'я набору стікерів.
   * @param sticker Стікер для додавання. Має бути об'єкт `InputSticker`.
   * @returns `True` у разі успіху.
   */
  public async addStickerToSet(user_id: number, name: string, sticker: InputSticker): Promise<boolean> {
    return this.client.raw.addStickerToSet({
      user_id,
      name,
      sticker
    });
  }

  /**
   * Використовуйте цей метод, щоб перемістити стікер з набору, створеного ботом, у певну позицію.
   * Повертає `True` у разі успіху.
   * 
   * @param sticker Ідентифікатор стікера.
   * @param position Нова позиція стікера.
   * @returns `True` у разі успіху.
   */
  public async setStickerPositionInSet(sticker: string, position: number): Promise<boolean> {
    return this.client.raw.setStickerPositionInSet({
      sticker,
      position
    });
  }

  /**
   * Використовуйте цей метод, щоб видалити стікер з набору стікерів.
   * Повертає `True` у разі успіху.
   * 
   * @param sticker Ідентифікатор стікера.
   * @returns `True` у разі успіху.
   */
  public async deleteStickerFromSet(sticker: string): Promise<boolean> {
    return this.client.raw.deleteStickerFromSet({
      sticker
    });
  }

  /**
   * Використовуйте цей метод для заміни стікера у наборі стікерів.
   * Повертає `True` у разі успіху.
   * 
   * @param user_id Ідентифікатор користувача, що створює набір стікерів.
   * @param name Ім'я набору стікерів.
   * @param old_sticker Ідентифікатор стікера, який потрібно замінити.
   * @param sticker Новий стікер. Має бути об'єкт `InputSticker`.
   * @returns `True` у разі успіху.
   */
  public async replaceStickerInSet(user_id: number, name: string, old_sticker: string, sticker: InputSticker): Promise<boolean> {
    return this.client.raw.replaceStickerInSet({
      user_id,
      name,
      old_sticker,
      sticker
    });
  }

  /**
   * Використовуйте цей метод, щоб змінити список емодзі, призначених звичайному або власному стікеру емодзі.
   * Стікер має належати до набору стікерів, створеного ботом.
   * Повертає `True` у разі успіху.
   * 
   * @param sticker Ідентифікатор стікера.
   * @param emoji_list Список емодзі.
   * @returns `True` у разі успіху.
   */
  public async setStickerEmojiList(sticker: string, emoji_list: string[]): Promise<boolean> {
    return this.client.raw.setStickerEmojiList({
      sticker,
      emoji_list
    });
  }

  /**
   * Використовуйте цей метод, щоб змінити список ключових слів, призначених звичайному або власному стікеру емодзі.
   * Стікер має належати до набору стікерів, створеного ботом.
   * Повертає `True` у разі успіху.
   * 
   * @param sticker Ідентифікатор стікера.
   * @param keywords Список ключових слів.
   * @returns `True` у разі успіху.
   */
  public async setStickerKeywords(sticker: string, keywords: string[]): Promise<boolean> {
    return this.client.raw.setStickerKeywords({
      sticker,
      keywords
    });
  }

  /**
   * Використовуйте цей метод для зміни положення маски стікера.
   * Стікер має належати до набору, створеного ботом.
   * Повертає `True` у разі успіху.
   * 
   * @param sticker Ідентифікатор стікера.
   * @param options Додаткові параметри.
   * @returns `True` у разі успіху.
   */
  public async setStickerMaskPosition(sticker: string, options?: Omit<SetStickerMaskPositionParams, 'sticker'>): Promise<boolean> {
    return this.client.raw.setStickerMaskPosition({
      sticker,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для встановлення заголовка створеного набору стікерів.
   * Повертає `True` у разі успіху.
   * 
   * @param name Ім'я набору стікерів.
   * @param title Нова назва набору стікерів.
   * @returns `True` у разі успіху.
   */
  public async setStickerSetTitle(name: string, title: string): Promise<boolean> {
    return this.client.raw.setStickerSetTitle({
      name,
      title
    });
  }

  /**
   * Використовуйте цей метод для встановлення мініатюри звичайного набору стікерів або набору масок.
   * Формат файлу мініатюр має відповідати формату стікерів у наборі.
   * Повертає `True` у разі успіху.
   * 
   * @param name Ім'я набору стікерів.
   * @param user_id Ідентифікатор користувача, який створює набір стікерів.
   * @param format Формат файлу мініатюр.
   * @param options Додаткові параметри.
   * @returns `True` у разі успіху.
   */
  public async setStickerSetThumbnail(name: string, user_id: number, format: string, options?: Omit<SetStickerSetThumbnailParams, 'name' | 'user_id' | 'format'>): Promise<boolean> {
    return this.client.raw.setStickerSetThumbnail({
      name,
      user_id,
      format,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для встановлення мініатюри набору власних емодзі-стікерів.
   * Повертає `True` у разі успіху.
   * 
   * @param name Ім'я набору стікерів.
   * @param custom_emoji_id Ідентифікатор емодзі.
   * @returns `True` у разі успіху.
   */
  public async setCustomEmojiStickerSetThumbnail(name: string, custom_emoji_id: string): Promise<boolean> {
    return this.client.raw.setCustomEmojiStickerSetThumbnail({
      name,
      custom_emoji_id
    });
  }

  /**
   * Використовуйте цей метод для видалення набору стікерів, створених ботом.
   * Повертає `True` у разі успіху.
   * 
   * @param name Ім'я набору стікерів.
   * @returns `True` у разі успіху.
   */
  public async deleteStickerSet(name: string): Promise<boolean> {
    return this.client.raw.deleteStickerSet({
      name
    });
  }

  /**
   * Використовуйте цей метод для надсилання відповідей на вбудований запит.
   * У разі успіху повертається значення `True`.
   * Дозволено не більше 50 результатів на запит.
   * 
   * @param inline_query_id Ідентифікатор інлайн-запиту.
   * @param results Масив результатів.
   * @param options Додаткові параметри.
   * @returns `True` у разі успіху.
   */
  public async answerInlineQuery(inline_query_id: string, results: InlineQueryResult[], options?: Omit<AnswerInlineQueryParams, 'inline_query_id' | 'results'>): Promise<boolean> {
    return this.client.raw.answerInlineQuery({
      inline_query_id,
      results,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для надсилання рахунків-фактур.
   * У разі успіху надіслане повідомлення повертається.
   *
   * @param chat_id Ідентифікатор чату.
   * @param title Заголовок інвойсу.
   * @param description Опис інвойсу.
   * @param payload Внутрішня інформація про інвойс.
   * @param currency Валюта інвойсу.
   * @param prices Ціни інвойсу.
   * @param options Додаткові параметри.
   * @returns Надіслане повідомлення.
   */
  public async sendInvoice(chat_id: number | string, title: string, description: string, payload: string, currency: string, prices: LabeledPrice[], options?: Omit<SendInvoiceParams, 'chat_id' | 'title' | 'description' | 'payload' | 'currency' | 'prices'>): Promise<Message> {
    return this.client.raw.sendInvoice({
      chat_id,
      title,
      description,
      payload,
      currency,
      prices,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для створення посилання на рахунок-фактуру.
   * У разі успіху повертає створене посилання на рахунок-фактуру як рядок.
   * 
   * @param title Заголовок інвойсу.
   * @param description Опис інвойсу.
   * @param payload Внутрішня інформація про інвойс.
   * @param currency Валюта інвойсу.
   * @param prices Ціни інвойсу.
   * @param options Додаткові параметри.
   * @returns Створене посилання на інвойс.
   */
  public async createInvoiceLink(title: string, description: string, payload: string, currency: string, prices: LabeledPrice[], options?: Omit<CreateInvoiceLinkParams, 'title' | 'description' | 'payload' | 'currency' | 'prices'>): Promise<string> {
    return this.client.raw.createInvoiceLink({
      title,
      description,
      payload,
      currency,
      prices,
      ...options
    });
  }

  /**
   * Якщо ви надіслали рахунок-фактуру із запитом на адресу доставки, і було вказано параметр `is_flexible`, API бота надішле боту оновлення з полем `shipping_query`.
   * Використовуйте цей метод для відповіді на запити щодо доставки.
   * У разі успіху повертається значення `True`.
   * 
   * @param shipping_query_id Ідентифікатор запиту на доставку.
   * @param ok Чи успішна відповідь.
   * @param shipping_options Масив варіантів доставки.
   * @returns `True` у разі успіху.
   */
  public async answerShippingQuery(shipping_query_id: string, ok: boolean, shipping_options?: ShippingOption[]): Promise<boolean> {
    return this.client.raw.answerShippingQuery({
      shipping_query_id,
      ok,
      shipping_options
    });
  }

  /**
   * Після того, як користувач підтвердив свої платіжні та доставку дані, Bot API надсилає остаточне підтвердження у вигляді оновлення з полем `pre_checkout_query`.
   * Використовуйте цей метод для відповіді на такі запити перед оформленням замовлення.
   * У разі успіху повертається значення `True`.
   * 
   * **Примітка**: Bot API має отримати відповідь протягом 10 секунд після надсилання запиту перед оформленням замовлення.
   * 
   * @param pre_checkout_query_id Ідентифікатор запиту на передплату.
   * @param ok Чи успішна відповідь.
   * @param error Повідомлення про помилку.
   * @returns `True` у разі успіху.
   */
  public async answerPreCheckoutQuery(pre_checkout_query_id: string, ok: boolean, options?: Omit<AnswerPreCheckoutQueryParams, 'pre_checkout_query_id' | 'ok'>): Promise<boolean> {
    return this.client.raw.answerPreCheckoutQuery({
      pre_checkout_query_id,
      ok,
      ...options
    });
  }

  /**
   * Метод для отримання поточного балансу Telegram Stars бота.
   * Не потребує параметрів.
   * У разі успіху повертає об'єкт `StarAmount`.
   * 
   * @returns Об'єкт `StarAmount`.
   */
  public async getMyStarBalance(): Promise<StarAmount> {
    return this.client.raw.getMyStarBalance();
  }

  /**
   * Повертає транзакції бота в Telegram Star у хронологічному порядку.
   * У разі успіху повертає об'єкт `StarTransactions`.
   * 
   * @param options Параметри для фільтрації транзакцій.
   * @returns Об'єкт `StarTransactions` з інформацією про транзакції.
   */
  public async getStarTransactions(options?: GetStarTransactionsParams): Promise<StarTransactions> {
    return this.client.raw.getStarTransactions({
      ...options
    });
  }

  /**
   * Повертає кошти за успішний платіж у Telegram Stars.
   * Повертає `True` у разі успіху.
   * 
   * @param user_id Ідентифікатор користувача.
   * @param telegram_payment_charge_id Ідентифікатор транзакції Telegram платежів.
   * @returns `True` у разі успіху.
   */
  public async refundStarPayment(user_id: number, telegram_payment_charge_id: string): Promise<boolean> {
    return this.client.raw.refundStarPayment({ user_id, telegram_payment_charge_id });
  }

  /**
   * Дозволяє боту скасувати або повторно ввімкнути продовження підписки, оплаченої в Telegram Stars.
   * Повертає `True` у разі успіху.
   * 
   * @param user_id Ідентифікатор користувача.
   * @param telegram_payment_charge_id Ідентифікатор платежу Telegram для підписки.
   * @param is_canceled Чи скасовано підписку.
   * @returns `True` у разі успіху.
   */
  public async editUserStarSubscription(user_id: number, telegram_payment_charge_id: string, is_canceled: boolean): Promise<boolean> {
    return this.client.raw.editUserStarSubscription({ user_id, telegram_payment_charge_id, is_canceled });
  }

  /**
   * Використовуйте цей метод для надсилання гри.
   * У разі успіху надіслане повідомлення повертається.
   * 
   * @param chat_id Ідентифікатор чату.
   * @param game_short_name Назва гри.
   * @param options Додаткові параметри.
   * @returns Об'єкт `Message`.
   */
  public async sendGame(chat_id: number, game_short_name: string, options?: Omit<SendGameParams, 'chat_id' | 'game_short_name'>): Promise<Message> {
    return this.client.raw.sendGame({
      chat_id,
      game_short_name,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для встановлення рахунку вказаного користувача в ігровому повідомленні.
   * У разі успіху, якщо повідомлення не є вбудованим повідомленням, повертається значення `Message`, інакше повертається значення `True`.
   * Повертає помилку, якщо новий рахунок не перевищує поточний рахунок користувача в чаті, а примусове значення False.
   * 
   * @param user_id Ідентифікатор користувача.
   * @param score Оцінка гравця.
   * @param options Додаткові параметри.
   * @returns Об'єкт `Message` або `True`.
   */
  public async setGameScore(user_id: number, score: number, options?: Omit<SetGameScoreParams, 'user_id' | 'score'>): Promise<Message | boolean> {
    return this.client.raw.setGameScore({
      user_id,
      score,
      ...options
    });
  }

  /**
   * Використовуйте цей метод для отримання даних для таблиць рекордів.
   * Повертає рахунок зазначеного користувача та кількох його сусідів у грі.
   * Повертає масив об'єктів `GameHighScore`.
   * 
   * Цей метод наразі повертатиме оцінки для цільового користувача, а також двох його найближчих сусідів з кожного боку.
   * Також повертатиме трьох найперших користувачів, якщо користувач та його сусіди не входять до їх числа.
   * Зверніть увагу, що ця поведінка може змінюватися.
   * 
   * @param user_id Ідентифікатор користувача.
   * @param options Додаткові параметри.
   * @returns Масив об'єктів `GameHighScore` з інформацією про рахунок користувача.
   */
  public async getGameHighScores(user_id: number, options?: Omit<GetGameHighScoresParams, 'user_id'>): Promise<GameHighScore[]> {
    return this.client.raw.getGameHighScores({
      user_id,
      ...options
    });
  }

}