// src/bot.ts
import { Composer } from './composer';
import { BaseTelegramClient } from './base-api';
import { SendMessageParams, Message, Update, GetUpdatesParams, SetWebhookParams, WebhookInfo, DeleteWebhookParams, User, ForwardMessageParams, ForwardMessagesParams, MessageId, CopyMessageParams, CopyMessagesParams, SendPhotoParams, SendAudioParams, SendDocumentParams, SendVideoParams, SendAnimationParams, SendVoiceParams, SendVideoNoteParams, SendPaidMediaParams, InputPaidMedia, SendMediaGroupParams, InputMediaVideo, InputMediaPhoto, InputMediaDocument, InputMediaAudio, SendLocationParams, SendVenueParams, SendContactParams, InputPollOption, SendPollParams, SendChecklistParams, InputChecklist, SendDiceParams, SendMessageDraftParams, SendChatActionParams, ReactionType, UserProfilePhotos, GetUserProfilePhotosParams, UserProfileAudios, GetUserProfileAudiosParams, SetUserEmojiStatusParams, GetFileParams, File as TelegramFile, BanChatMemberParams, UnbanChatMemberParams, RestrictChatMemberParams, ChatPermissions, PromoteChatMemberParams, SetChatMemberTagParams, SetChatPermissionsParams, ChatInviteLink, CreateChatInviteLinkParams, EditChatInviteLinkParams, CreateChatSubscriptionInviteLinkParams, EditChatSubscriptionInviteLinkParams, InputFile, PinChatMessageParams, UnpinChatMessageParams, ChatFullInfo, ChatMember, Sticker, CreateForumTopicParams, ForumTopic, EditForumTopicParams, AnswerCallbackQueryParams, UserChatBoosts, BusinessConnection, BotCommand, SetMyCommandsParams, DeleteMyCommandsParams, GetMyCommandsParams, SetMyNameParams, GetMyNameParams, BotName, SetMyDescriptionParams, GetMyDescriptionParams, BotDescription, SetMyShortDescriptionParams, GetMyShortDescriptionParams, BotShortDescription, SetMyProfilePhotoParams, InputProfilePhoto, SetChatMenuButtonParams, MenuButton, SetMyDefaultAdministratorRightsParams, GetMyDefaultAdministratorRightsParams, ChatAdministratorRights, Gifts, SendGiftParams, VerifyUserParams, VerifyChatParams, SetBusinessAccountNameParams, SetBusinessAccountUsernameParams, SetBusinessAccountBioParams, SetBusinessAccountProfilePhotoParams, RemoveBusinessAccountProfilePhotoParams, AcceptedGiftTypes, StarAmount, GetBusinessAccountGiftsParams, OwnedGifts, GetUserGiftsParams, GetChatGiftsParams, UpgradeGiftParams, TransferGiftParams, Story, InputStoryContent, PostStoryParams, RepostStoryParams, EditStoryParams, InlineQueryResult, SentWebAppMessage, PreparedInlineMessage, KeyboardButton, PreparedKeyboardButton, EditMessageTextParams, EditMessageCaptionParams, EditMessageMediaParams, InputMedia, EditMessageLiveLocationParams, StopMessageLiveLocationParams, EditMessageChecklistParams, EditMessageReplyMarkupParams, StopPollParams, ApproveSuggestedPostParams, DeclineSuggestedPostParams, Poll, SendStickerParams, StickerSet, InputSticker, CreateNewStickerSetParams, SetStickerMaskPositionParams, SetStickerSetThumbnailParams, AnswerInlineQueryParams, InlineQueryResultsButton, LabeledPrice, SendInvoiceParams, CreateInvoiceLinkParams, ShippingOption, AnswerPreCheckoutQueryParams, GetStarTransactionsParams, StarTransactions, SendGameParams, SetGameScoreParams, GetGameHighScoresParams, GameHighScore, GiftPremiumSubscriptionParams, SendLivePhotoParams, SentGuestMessage, GetChatAdministratorsParams, SavePreparedInlineMessageParams, DeleteAllMessageReactionsParams, DeleteMessageReactionParams, InputMediaLivePhoto, GetManagedBotAccessSettingsParams, BotAccessSettings, SetManagedBotAccessSettingsParams } from '../types/telegram';
import { Context } from './context';

/**
 * Bot action status in the chat
 */
export type ChatAction = "typing" | "upload_photo" | "record_video" | "upload_video" | "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location" | "record_video_note" | "upload_video_note";

export type EditMessageIds =
  | { chat_id: number | string; message_id: number }
  | string;

// Global registry for CLI build tools (utf-build)
export let _activeBotInstance: any = null;

// 1. Pass generic C to Composer
export class TelegramBot<C extends Context = Context> extends Composer<C> {
  private client: BaseTelegramClient;

  constructor(client: BaseTelegramClient) {
    super();
    this.client = client;
    _activeBotInstance = this;
  }

  /**
   * Internal method used by the utf-build CLI to dynamically inject
   * the GAS API client at runtime. Do not use manually.
   */
  public _setClient(newClient: BaseTelegramClient): void {
    this.client = newClient;
  }

  /**
   * Main method for processing incoming Updates from Telegram.
   * It automatically creates a base `Context` object and starts the middleware chain.
   * * ⚠️ **Architectural note regarding custom context (Generic C):**
   * This library uses the approach of extending context through interfaces and middlewares 
   * (so-called hydration), rather than through class inheritance. 
   * Under the hood, a base instance of `Context` is always created, which is forcibly cast to your type `C`.
   * * To add your own fields (e.g., sessions, DB connections, etc.), describe them in an interface
   * and initialize them in your first middleware:
   * * @example
   * interface MyContext extends Context {
   * db: CustomDatabase;
   * session: { step: number };
   * }
   * const bot = new TelegramBot<MyContext>(client);
   * * // Context hydration
   * bot.use(async (ctx, next) => {
   * ctx.db = new CustomDatabase();
   * ctx.session = { step: 0 };
   * await next();
   * });
   * @param update Incoming update from Telegram
   * @returns `Promise<void>`
   */
  public async handleUpdate(update: Update): Promise<void> {
    try {
      const ctx = new Context(update, this.client.raw) as unknown as C;
      // Start the middleware chain.
      // Call this.middleware(), which returns a function with built-in try/catch and errorHandler
      await this.middleware()(ctx, async () => { });
    } catch (error) {
      console.error("❌ Error in the middleware chain:", error);
    }
  }

  public async launch(options: { timeout?: number; allowed_updates?: string[]; drop_pending_updates?: boolean } = {}): Promise<void> {
    console.log("🚀 Bot is starting in Long Polling mode...");

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

          await this.handleUpdate(update).catch(err => {
            console.error("❌ Error in the middleware chain:", err);
          });
        }
      } catch (error) {
        console.error("⚠️ Network or API error during getUpdates:", error);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }


  /**
   * Use this method to receive incoming updates using long polling.
   * Returns an array of `Update` objects.
   * 
   * @param options Additional parameters for receiving updates
   * @returns `Update[]` on success
   */
  public async getUpdates(options: GetUpdatesParams = {}): Promise<Update[]> {
    return this.client.raw.getUpdates(options);
  }

  /**
   * Use this method to specify a URL and receive incoming updates via an outgoing webhook.
   * Whenever there is an update for the bot, we will send an HTTPS POST request to the specified URL containing a serialized JSON update. 
   * In case of a failed request (a request with an HTTP response status code other than 2XY), we will retry the request and stop its execution after a sufficient number of attempts. 
   * Returns `True` on success.
   * 
   * If you want to ensure that the webhook was set by you, you can specify secret data in the parameter `secret_token`.
   * If specified, the request will contain an "X-Telegram-Bot-Api-Secret-Token" header with the secret token as its content.
   * 
   * **Important:** Ensure that your URL uses a valid SSL certificate. Requests with invalid certificates will be ignored.
   * For testing in a local environment, you can use ngrok or similar services.
   * 
   * @param url Webhook URL
   * @param options Additional webhook parameters
   * @returns `boolean` on success
   */
  public async setWebhook(url: string, options?: Omit<SetWebhookParams, 'url'>): Promise<boolean> {
    return this.client.raw.setWebhook({ url, ...options });
  }

  /**
   * Use this method to stop using the webhook and start working in long polling mode.
   * Returns `True` on success.
   * 
   * @param options Additional parameters for deleting the webhook
   * @returns `boolean` on success
   */
  public async deleteWebhook(options?: DeleteWebhookParams): Promise<boolean> {
    return this.client.raw.deleteWebhook({ ...options });
  }

  /**
   * Use this method to get current information about the webhook set for your bot. Returns `WebhookInfo`.
   * 
   * @returns `WebhookInfo` on success
   */
  public async getWebhookInfo(): Promise<WebhookInfo> {
    return this.client.raw.getWebhookInfo();
  }

  /**
   * Use this method to get information about the bot.
   * Returns `User`.
   * 
   * @returns `User` on success
   */
  public async getMe(): Promise<User> {
    return this.client.raw.getMe();
  }

  /**
   * Use this method to log out the bot.
   * Returns `boolean`.
   * 
   * @returns `boolean` on success
   */
  public async logOut(): Promise<boolean> {
    return this.client.raw.logOut();
  }

  /**
   * Use this method to close the bot instance before moving it from one local server to another.
   * You need to delete the webhook before calling this method so that the bot doesn't start again after a server restart.
   * The method will return a 429 error during the first 10 minutes after the bot starts.
   * Returns `True` on success.
   * 
   * @returns `True` on success
   */
  public async close(): Promise<boolean> {
    return this.client.raw.close();
  }

  /**
   * Use this method to send a text message.
   * Returns `Message`.
   * 
   * @param chat_id Unique identifier for the target chat or channel username (in the format @channelusername)
   * @param text Message text to send (1-4096 characters after entity parsing)
   * @param options Additional message parameters
   * @returns `Message` on success
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
   * Use this method to forward messages of any type.
   * Service messages and messages with protected content cannot be forwarded.
   * On success, the sent message is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param from_chat_id Unique identifier for the chat from which the message is forwarded
   * @param message_id Identifier of the message in the `from_chat_id` chat
   * @param options Additional forwarding parameters
   * @returns `Message` on success
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
   * Use this method to forward multiple messages of any type.
   * If some of the specified messages cannot be found or forwarded, they are skipped.
   * Service messages and messages with protected content cannot be forwarded.
   * Grouping by albums is preserved for forwarded messages.
   * On success, an array of `MessageId` of the sent messages is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param from_chat_id Unique identifier for the chat from which messages are forwarded
   * @param message_ids Array of message identifiers in the `chat_id` chat
   * @param options Additional forwarding parameters
   * @returns `MessageId[]` on success
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
   * Use this method to copy messages of any type.
   * Service messages and messages with protected content cannot be forwarded.
   * On success, the `MessageId` of the sent message is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param from_chat_id Unique identifier for the chat from which messages are forwarded
   * @param message_id Identifier of the message in the `chat_id` chat
   * @param options Additional copying parameters
   * @returns `MessageId` on success
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
   * Use this method to copy multiple messages of any type.
   * If some of the specified messages cannot be found or copied, they are skipped.
   * Service messages and messages with protected content cannot be copied.
   * Grouping by albums is preserved for copied messages.
   * On success, an array of `MessageId` of the copied messages is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param from_chat_id Unique identifier for the chat from which messages are forwarded
   * @param message_ids Message identifiers in the `chat_id` chat
   * @param options Additional copying parameters
   * @returns `MessageId[]` on success
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
   * Use this method to send photos in real time.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param live_photo Video part of a live photo (URL or InputFile)
   * @param photo Photo (URL or InputFile)
   * @param options Additional sending parameters
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
   * Use this method to send photos.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param photo Photo to send (File ID, URL or file object)
   * @param options Additional photo parameters
   * @returns `Message` on success
   */
  public async sendPhoto(chat_id: string | number, photo: string | InputFile, options?: Omit<SendPhotoParams, 'chat_id' | 'photo'>): Promise<Message> {
    return this.client.raw.sendPhoto({
      chat_id,
      photo,
      ...options
    });
  }

  /**
   * Use this method to send audio files, if you want Telegram clients to display them in the music player.
   * Your audio file must be in the .MP3 or .M4A format.
   * On success, the sent message is returned.
   * Bots can currently send audio files up to 50 MB, this limit may be changed in the future.
   * For sending voice messages, use the `sendVoice` method.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param audio Audio to send (File ID, URL or file object)
   * @param options Additional audio parameters
   * @returns `Message` on success
   */
  public async sendAudio(chat_id: string | number, audio: string | InputFile, options?: Omit<SendAudioParams, 'chat_id' | 'audio'>): Promise<Message> {
    return this.client.raw.sendAudio({
      chat_id,
      audio,
      ...options
    });
  }

  /**
   * Use this method to send general files.
   * On success, the sent `Message` is returned.
   * Bots can currently send files of any type up to 50 MB, this limit may be changed in the future.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param document File to send (File ID, URL or file object)
   * @param options Additional file parameters
   * @returns `Message` on success
   */
  public async sendDocument(chat_id: string | number, document: string | InputFile, options?: Omit<SendDocumentParams, 'chat_id' | 'document'>): Promise<Message> {
    return this.client.raw.sendDocument({
      chat_id,
      document,
      ...options
    });
  }

  /**
   * Use this method to send video files.
   * Telegram clients support MPEG4 video (other formats can be sent as a document).
   * On success, the sent `Message` is returned.
   * Bots can currently send video files up to 50 MB, this limit may be changed in the future.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param video Video to send (File ID, URL or file object)
   * @param options Additional video parameters
   * @returns `Message` on success
   */
  public async sendVideo(chat_id: string | number, video: string | InputFile, options?: Omit<SendVideoParams, 'chat_id' | 'video'>): Promise<Message> {
    return this.client.raw.sendVideo({
      chat_id,
      video,
      ...options
    });
  }

  /**
   * Use this method to send animation files (GIF or H.264/MPEG-4 AVC video without sound).
   * On success, the sent `Message` is returned.
   * Bots can currently send animation files up to 50 MB, this limit may be changed in the future.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param animation Animation to send (File ID, URL or file object)
   * @param options Additional animation parameters
   * @returns `Message` on success
   */
  public async sendAnimation(chat_id: string | number, animation: string | InputFile, options?: Omit<SendAnimationParams, 'chat_id' | 'animation'>): Promise<Message> {
    return this.client.raw.sendAnimation({
      chat_id,
      animation,
      ...options
    });
  }

  /**
   * Use this method to send audio files, if you want Telegram clients to display the file as a playable voice message.
   * For this to work, your audio must be in an .OGG file encoded with OPUS, or in .MP3 or .M4A format (other formats may be sent as audio or document).
   * On success, the sent message is returned.
   * Bots can currently send voice messages up to 50 MB, this limit may be changed in the future.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param voice Audio to send (File ID, URL or file object)
   * @param options Additional audio parameters
   * @returns `Message` on success
   */
  public async sendVoice(chat_id: string | number, voice: string | InputFile, options?: Omit<SendVoiceParams, 'chat_id' | 'voice'>): Promise<Message> {
    return this.client.raw.sendVoice({
      chat_id,
      voice,
      ...options
    });
  }

  /**
   * Use this method to send video messages (videos up to 60 seconds long).
   * Currently, video message duration is limited to 60 seconds, but this limit may be changed in the future.
   * Bots can currently send video messages up to 50 MB, this limit may be changed in the future.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param video_note Video message to send (File ID, URL or file object)
   * @param options Additional video message parameters
   * @returns `Message` on success
   */
  public async sendVideoNote(chat_id: string | number, video_note: string | InputFile, options?: Omit<SendVideoNoteParams, 'chat_id' | 'video_note'>): Promise<Message> {
    return this.client.raw.sendVideoNote({
      chat_id,
      video_note,
      ...options
    });
  }

  /**
   * Use this method to send paid media files.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param star_count Number of stars to send
   * @param media Array of paid media files
   * @param options Additional paid media parameters
   * @returns `Message` on success
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
   * Use this method to send a group of photos, videos, documents, or audio as an album.
   * Documents and audio files can only be grouped in an album with messages of the same type.
   * On success, an array of the sent `Message` objects is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param media Array of media files to send
   * @param options Additional media file parameters
   * @returns `Message[]` on success
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
   * Use this method to send a point on the map.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param latitude Latitude
   * @param longitude Longitude
   * @param options Additional geolocation parameters
   * @returns `Message` on success
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
   * Use this method to send venue information.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param latitude Latitude
   * @param longitude Longitude
   * @param title Venue name
   * @param address Address
   * @param options Additional venue parameters
   * @returns `Message` on success
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
   * Use this method to send user contact information.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param phone_number Phone number
   * @param first_name Contact first name
   * @param options Additional contact parameters
   * @returns `Message` on success
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
   * Use this method to send a poll.
   * On success, the sent `Message` is returned.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param question Poll text
   * @param poll_options Array of answer options
   * @param options Additional poll parameters
   * @returns `Message` on success
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
   * Use this method to send a checklist on behalf of a connected business account.
   * On success, the sent `Message` is returned.
   * 
   * @param business_connection_id Business account identifier
   * @param chat_id Unique identifier for the target chat
   * @param checklist Checklist to send
   * @param options Additional checklist parameters
   * @returns `Message` on success
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
   * Use this method to send an animated emoji that will display a random value.
   * Returns `Message` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param options Additional animated emoji parameters (emoji, etc.)
   * @returns `Message` on success
   */
  public async sendDice(chat_id: string | number, options?: Omit<SendDiceParams, 'chat_id'>): Promise<Message> {
    return this.client.raw.sendDice({
      chat_id,
      ...options
    });
  }

  /**
   * Use this method to stream a part of a message to the user during its generation.
   * Returns `boolean` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param draft_id Unique draft identifier
   * @param text Message text
   * @param options Additional draft parameters
   * @returns `boolean` on success
   */
  public async sendMessageDraft(chat_id: number, draft_id: number, text: string, options?: Omit<SendMessageDraftParams, 'chat_id' | 'draft_id' | 'text'>): Promise<boolean> {
    return this.client.raw.sendMessageDraft({
      chat_id,
      draft_id,
      text,
      ...options
    });
  }

  /**
   * Use this method when you need to inform the user that something is happening on the bot's side.
   * The status is set for 5 seconds or less (when a message arrives from your bot, Telegram clients clear its typing status).
   * Returns `True` on success.
   * 
   * **Example:** ImageBot needs some time to process the request and upload the image.
   * Instead of sending a text message like "Getting image, please wait...", the bot can use `sendChatAction` with `action = 'upload_photo'`.
   * The user will see the bot status "uploading photo".
   * 
   * @param chat_id Unique identifier for the target chat
   * @param action Type of action to broadcast
   * @param options Additional action parameters
   * @returns `True` on success
   */
  public async sendChatAction(chat_id: string | number, action: ChatAction, options?: Omit<SendChatActionParams, 'chat_id' | 'action'>): Promise<boolean> {
    return this.client.raw.sendChatAction({
      chat_id,
      action,
      ...options
    });
  }

  /**
   * Use this method to change chosen reactions on a message.
   * Service messages of some types cannot be reacted to.
   * Automatically forwarded messages from a channel to its discussion group have the same available reactions as messages in the channel.
   * Bots cannot use paid reactions.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_id Unique identifier for the message
   * @param reaction Array of reactions to set
   * @returns `True` on success
   */
  public async setMessageReaction(chat_id: string | number, message_id: number, reaction: ReactionType[]): Promise<boolean> {
    return this.client.raw.setMessageReaction({
      chat_id,
      message_id,
      reaction
    });
  }

  /**
   * Use this method to get a list of user profile photos.
   * Returns a `UserProfilePhotos` object with user photos, starting from the newest.
   * 
   * @param user_id Unique identifier for the target user
   * @param options Additional profile photo parameters
   * @returns `UserProfilePhotos` on success
   */
  public async getUserProfilePhotos(user_id: number, options?: Omit<GetUserProfilePhotosParams, 'user_id'>): Promise<UserProfilePhotos> {
    return this.client.raw.getUserProfilePhotos({
      user_id,
      ...options
    });
  }

  /**
   * Use this method to get a list of user profile audio.
   * Returns a `UserProfileAudios` object.
   * 
   * @param user_id Unique identifier for the target user
   * @param options Additional profile audio parameters
   * @returns `UserProfileAudios` on success
   */
  public async getUserProfileAudios(user_id: number, options?: Omit<GetUserProfileAudiosParams, 'user_id'>): Promise<UserProfileAudios> {
    return this.client.raw.getUserProfileAudios({
      user_id,
      ...options
    });
  }

  /**
   * Use this method to set a user's emoji status.
   * Returns `True` on success.
   * 
   * @param user_id Unique identifier for the target user
   * @param options Additional emoji status parameters
   * @returns `True` on success
   */
  public async setUserEmojiStatus(user_id: number, options?: Omit<SetUserEmojiStatusParams, 'user_id'>): Promise<boolean> {
    return this.client.raw.setUserEmojiStatus({
      user_id,
      ...options
    });
  }

  /**
   * Use this method to get basic information about a file and prepare it for downloading.
   * Currently, bots can download files of up to 20 MB in size.
   * On success, a `TelegramFile` object is returned.
   * The file can be downloaded via the link `https://api.telegram.org/file/bot<token>/<file_path>`, where `file_path` is taken from the response.
   * It is guaranteed that the link will be valid for at least 1 hour.
   * When the link expires, a new one can be requested by calling `getFile` again.
   * 
   * @param file_id Unique file identifier
   * @returns `TelegramFile` with file information
   */
  public async getFile(file_id: string): Promise<TelegramFile> {
    return this.client.raw.getFile({ file_id });
  }

  /**
   * Use this method to ban a user in a group, a supergroup or a channel.
   * In the case of supergroups and channels, the user will not be able to return to the chat on their own using invite links, etc., unless unbanned first.
   * For this to work, the bot must be an administrator in the chat and have the appropriate administrator rights.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id Unique identifier for the target user
   * @param options Additional ban parameters
   * @returns `true` on success
   */
  public async banChatMember(chat_id: string | number, user_id: number, options?: Omit<BanChatMemberParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.banChatMember({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Use this method to unban a previously banned user in a supergroup or channel.
   * The user **will not return** to the group or channel **automatically**, but **will be able** to join via an **invite link**, etc.
   * The bot must be an administrator for this to work.
   * By default, this method guarantees that after the call the **user will not be** a member of the chat, but **will be able** to join it.
   * So, if the user is a member of the chat, they **will also be removed** from the chat.
   * If you don't want this, use the `only_if_banned` parameter.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id Unique identifier for the target user
   * @param options Additional unban parameters
   * @returns `True` on success
   */
  public async unbanChatMember(chat_id: string | number, user_id: number, options?: Omit<UnbanChatMemberParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.unbanChatMember({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Use this method to restrict a user in a supergroup.
   * For this to work, the bot must be a supergroup administrator and have the appropriate administrator rights.
   * Pass `True` for all permissions to lift restrictions from a user.
   * 
   * @param chat_id Unique identifier for the chat or username of the target bot
   * @param user_id Unique user identifier
   * @param permissions New status of user rights
   * @param options Additional parameters
   * @returns `True` on success
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
   * Use this method to promote or demote a user in a supergroup or a channel.
   * For this to work, the bot must be a chat administrator and have the appropriate administrator rights.
   * Pass `False` for all boolean parameters to demote a user.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the chat or username of the target bot
   * @param user_id Unique user identifier
   * @param options Additional parameters
   * @returns `True` on success
   */
  public async promoteChatMember(chat_id: string | number, user_id: number, options?: Omit<PromoteChatMemberParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.promoteChatMember({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Use this method to set a custom title for an administrator in a supergroup promoted by the bot.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id Unique identifier for the target user
   * @param custom_title Custom title for the chat administrator
   * @returns `True` on success
   */
  public async setChatAdministratorCustomTitle(chat_id: string | number, user_id: number, custom_title: string): Promise<boolean> {
    return this.client.raw.setChatAdministratorCustomTitle({
      chat_id,
      user_id,
      custom_title
    });
  }

  /**
   * Use this method to set a tag for a regular group or supergroup member.
   * For this to work, the bot must be a chat administrator and have the `can_manage_tags` administrator right.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id Unique identifier for the target user
   * @param options Additional parameters
   * @returns `True` on success
   */
  public async setChatMemberTag(chat_id: string | number, user_id: number, options?: Omit<SetChatMemberTagParams, 'chat_id' | 'user_id'>): Promise<boolean> {
    return this.client.raw.setChatMemberTag({
      chat_id,
      user_id,
      ...options
    });
  }

  /**
   * Use this method to ban a channel chat in a supergroup or channel. 
   * Until the chat is unbanned, the owner of the banned chat will not be able to send messages on behalf of any of their channels.
   * For this to work, the bot must be a supergroup or channel administrator and have appropriate administrator rights.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param sender_chat_id Unique identifier of the sender
   * @returns `True` on success
   */
  public async banChatSenderChat(chat_id: string | number, sender_chat_id: number): Promise<boolean> {
    return this.client.raw.banChatSenderChat({
      chat_id,
      sender_chat_id
    });
  }

  /**
   * Use this method to unban a previously blocked channel chat in a supergroup or channel.
   * For this to work, the bot must be an administrator and have appropriate administrator rights.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param sender_chat_id Unique identifier of the sender
   * @returns `True` on success
   */
  public async unbanChatSenderChat(chat_id: string | number, sender_chat_id: number): Promise<boolean> {
    return this.client.raw.unbanChatSenderChat({
      chat_id,
      sender_chat_id
    });
  }

  /**
   * Use this method to set default chat permissions for all participants.
   * For this to work, the bot must be a group or supergroup administrator and have the `can_restrict_members` administrator right.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param permissions New status of user rights
   * @returns `True` on success
   */
  public async setChatPermissions(chat_id: string | number, permissions: ChatPermissions, options?: Omit<SetChatPermissionsParams, 'chat_id' | 'permissions'>): Promise<boolean> {
    return this.client.raw.setChatPermissions({
      chat_id,
      permissions,
      ...options
    });
  }

  /**
   * Use this method to create a new primary invite link for a chat; any previously created primary link will be revoked.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * On success, returns the new invite link as a string.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `string` on success
   */
  public async exportChatInviteLink(chat_id: string | number): Promise<string> {
    return this.client.raw.exportChatInviteLink({
      chat_id
    });
  }

  /**
   * Use this method to create an additional invite link for a chat.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * The link can be revoked using the `revokeChatInviteLink` method.
   * On success, returns the new invite link as a `ChatInviteLink` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `ChatInviteLink` on success
   */
  public async createChatInviteLink(chat_id: string | number, options?: Omit<CreateChatInviteLinkParams, 'chat_id'>): Promise<ChatInviteLink> {
    return this.client.raw.createChatInviteLink({
      chat_id,
      ...options
    });
  }

  /**
   * Use this method to edit a non-primary invite link created by the bot.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * On success, returns the edited invite link as a `ChatInviteLink` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param invite_link Chat invite link
   * @param options Parameters for changing the invite link
   * @returns `ChatInviteLink` on success
   */
  public async editChatInviteLink(chat_id: string | number, invite_link: string, options?: Omit<EditChatInviteLinkParams, 'chat_id' | 'invite_link'>): Promise<ChatInviteLink> {
    return this.client.raw.editChatInviteLink({
      chat_id,
      invite_link,
      ...options
    });
  }

  /**
   * Use this method to create a subscription invite link for a channel chat.
   * The bot must have the `can_invite_users` administrator right.
   * The link can be edited using the `editChatSubscriptionInviteLink` method or revoked using the `revokeChatInviteLink` method.
   * Returns the new invite link as a `ChatInviteLink` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param options Parameters for creating the invite link
   * @returns `ChatInviteLink` on success
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
   * Use this method to edit a subscription invite link created by the bot.
   * The bot must have the `can_invite_users` administrator right.
   * On success, returns the edited invite link as a `ChatInviteLink` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param invite_link Chat invite link
   * @param options Parameters for editing the invite link
   * @returns `ChatInviteLink` on success
   */
  public async editChatSubscriptionInviteLink(chat_id: string | number, invite_link: string, options?: Omit<EditChatSubscriptionInviteLinkParams, 'chat_id' | 'invite_link'>): Promise<ChatInviteLink> {
    return this.client.raw.editChatSubscriptionInviteLink({
      chat_id,
      invite_link,
      ...options
    });
  }

  /**
   * Use this method to revoke an invite link created by the bot.
   * If the primary link is revoked, a new link is automatically generated.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * On success, returns the revoked invite link as a `ChatInviteLink` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param invite_link Chat invite link
   * @returns `ChatInviteLink` on success
   */
  public async revokeChatInviteLink(chat_id: string | number, invite_link: string): Promise<ChatInviteLink> {
    return this.client.raw.revokeChatInviteLink({
      chat_id,
      invite_link
    });
  }

  /**
   * Use this method to approve a chat join request.
   * For this to work, the bot must be a chat administrator and have the `can_invite_users` administrator right.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id Unique user identifier
   * @returns `boolean` on success
   */
  public async approveChatJoinRequest(chat_id: string | number, user_id: number): Promise<boolean> {
    return this.client.raw.approveChatJoinRequest({
      chat_id,
      user_id
    });
  }

  /**
   * Use this method to decline a chat join request.
   * For this to work, the bot must be a chat administrator and have the `can_invite_users` administrator right.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id Unique user identifier
   * @returns `boolean` on success
   */
  public async declineChatJoinRequest(chat_id: string | number, user_id: number): Promise<boolean> {
    return this.client.raw.declineChatJoinRequest({
      chat_id,
      user_id
    });
  }

  /**
   * Use this method to upload a new profile photo for a chat.
   * For this to work, the bot must be a chat administrator.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param photo Photo to upload.
   * @returns `true` on success
   */
  public async setChatPhoto(chat_id: string | number, photo: InputFile): Promise<boolean> {
    return this.client.raw.setChatPhoto({
      chat_id,
      photo
    });
  }

  /**
   * Use this method to delete a chat profile photo.
   * For this to work, the bot must be a chat administrator.
   * Returns `true` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `boolean` on success
   */
  public async deleteChatPhoto(chat_id: string | number): Promise<boolean> {
    return this.client.raw.deleteChatPhoto({
      chat_id
    });
  }

  /**
   * Use this method to change the chat title. Titles cannot be changed for private chats.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param title New chat title
   * @returns `True` on success
   */
  public async setChatTitle(chat_id: string | number, title: string): Promise<boolean> {
    return this.client.raw.setChatTitle({
      chat_id,
      title
    });
  }

  /**
   * Use this method to change the description of a group, supergroup, or channel.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * Returns `true` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param description New chat description
   * @returns `True` on success
   */
  public async setChatDescription(chat_id: string | number, description?: string): Promise<boolean> {
    return this.client.raw.setChatDescription({
      chat_id,
      description
    });
  }

  /**
   * Use this method to add a message to the list of pinned messages in a chat. 
   * In private chats and channel direct message chats, all non-service messages can be pinned. 
   * Conversely, the bot must be an administrator with the `can_pin_messages` or `can_edit_messages` right to pin messages in groups and channels respectively. 
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_id Identifier of the message to pin
   * @returns `True` on success
   */
  public async pinChatMessage(chat_id: string | number, message_id: number, options?: Omit<PinChatMessageParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.pinChatMessage({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Use this method to remove a message from the list of pinned messages in a chat.
   * In private chats and channel direct message chats, all messages can be unpinned.
   * Conversely, the bot must be an administrator with the `can_pin_messages` or `can_edit_messages` right to unpin messages in groups and channels respectively.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param options Additional parameters (message_id, etc.)
   * @returns `True` on success
   */
  public async unpinChatMessage(chat_id: string | number, options?: Omit<UnpinChatMessageParams, 'chat_id'>): Promise<boolean> {
    return this.client.raw.unpinChatMessage({
      chat_id,
      ...options
    });
  }

  /**
   * Use this method to clear the list of pinned messages in a chat.
   * In private chats and channel direct message chats, no additional rights are required to unpin all pinned messages.
   * Conversely, the bot must be an administrator with the `can_pin_messages` or `can_edit_messages` right to unpin all pinned messages in groups and channels respectively.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async unpinAllChatMessages(chat_id: string | number): Promise<boolean> {
    return this.client.raw.unpinAllChatMessages({
      chat_id
    });
  }

  /**
   * Use this method for your bot to leave a group, supergroup, or channel.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async leaveChat(chat_id: string | number): Promise<boolean> {
    return this.client.raw.leaveChat({
      chat_id
    });
  }

  /**
   * Use this method to get up-to-date information about the chat.
   * On success, returns a `ChatFullInfo` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `ChatFullInfo` on success
   */
  public async getChat(chat_id: string | number): Promise<ChatFullInfo> {
    return this.client.raw.getChat({
      chat_id
    });
  }

  /**
   * Use this method to get a list of administrators in a chat who are not bots.
   * On success, returns an array of `ChatMember` objects.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param options Additional parameters
   * @returns `ChatMember[]` on success
   */
  public async getChatAdministrators(chat_id: string | number, options?: Omit<GetChatAdministratorsParams, 'chat_id'>): Promise<ChatMember[]> {
    return this.client.raw.getChatAdministrators({
      chat_id,
      ...options
    });
  }

  /**
   * Use this method to get the number of members in a chat.
   * Returns `int` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `number` on success
   */
  public async getChatMemberCount(chat_id: string | number): Promise<number> {
    return this.client.raw.getChatMemberCount({
      chat_id
    });
  }

  /**
   * Use this method to get information about a chat member.
   * The method is guaranteed to work for other users only if the bot is a chat administrator.
   * On success, returns a `ChatMember` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id User identifier
   * @returns `ChatMember` on success
   */
  public async getChatMember(chat_id: string | number, user_id: number): Promise<ChatMember> {
    return this.client.raw.getChatMember({
      chat_id,
      user_id
    });
  }

  /**
   * Use this method to set a new set of group stickers for a supergroup.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * Use the `can_set_sticker_set` field, which is optionally returned in `getChat` requests, to check if the bot can use this method.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param sticker_set_name Sticker set name
   * @returns `True` on success
   */
  public async setChatStickerSet(chat_id: string | number, sticker_set_name: string): Promise<boolean> {
    return this.client.raw.setChatStickerSet({
      chat_id,
      sticker_set_name
    });
  }

  /**
   * Use this method to delete a set of group stickers from a supergroup.
   * For this to work, the bot must be a chat administrator and have appropriate administrator rights.
   * Use the `can_set_sticker_set` field, which is optionally returned in `getChat` requests, to check if the bot can use this method.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async deleteChatStickerSet(chat_id: string | number): Promise<boolean> {
    return this.client.raw.deleteChatStickerSet({
      chat_id
    });
  }

  /**
   * Use this method to delete a reaction from a message in a group or supergroup chat.
   * The bot must have the `can_delete_messages` administrator right in the chat.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_id Message identifier
   * @param options Additional parameters
   * @returns `True` on success
   */
  public async deleteMessageReaction(chat_id: string | number, message_id: number, options?: Omit<DeleteMessageReactionParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.deleteMessageReaction({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Use this method to delete up to 10000 recent reactions in a group or supergroup chat added by a specific user or chat.
   * The bot must have the `can_delete_messages` administrator right in the chat.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param options Additional parameters
   * @returns `True` on success
   */
  public async deleteAllMessageReactions(chat_id: number | string, options?: Omit<DeleteAllMessageReactionsParams, 'chat_id'>): Promise<boolean> {
    return this.client.raw.deleteAllMessageReactions({
      chat_id,
      ...options
    });
  }

  /**
   * Use this method to get custom emoji stickers that any user can use as a forum topic icon.
   * Requires no parameters. Returns an array of `Sticker` objects.
   * 
   * @returns `Sticker[]` on success
   */
  public async getForumTopicIconStickers(): Promise<Sticker[]> {
    return this.client.raw.getForumTopicIconStickers();
  }

  /**
   * Use this method to create a topic in a forum supergroup chat or in a private chat with a user.
   * In the case of a supergroup chat, the bot must be a chat administrator for this to work and must have the `can_manage_topics` administrator right.
   * Returns information about the created topic as a `ForumTopic` object.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param name Forum topic name
   * @param options Additional parameters (icon_custom_emoji_id, etc.)
   * @returns `ForumTopic` on success
   */
  public async createForumTopic(chat_id: string | number, name: string, options?: Omit<CreateForumTopicParams, 'chat_id' | 'name'>): Promise<ForumTopic> {
    return this.client.raw.createForumTopic({
      chat_id,
      name,
      ...options
    });
  }

  /**
   * Use this method to edit the name and icon of a topic in a forum supergroup chat or in a private chat with a user.
   * In the case of a supergroup chat, the bot must be a chat administrator for this to work and must have the `can_manage_topics` administrator right, unless it is the topic author.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_thread_id Forum topic identifier
   * @param options Additional parameters (name, icon_custom_emoji_id)
   * @returns `true` on success
   */
  public async editForumTopic(chat_id: string | number, message_thread_id: number, options?: Omit<EditForumTopicParams, 'chat_id' | 'message_thread_id'>): Promise<boolean> {
    return this.client.raw.editForumTopic({
      chat_id,
      message_thread_id,
      ...options
    });
  }

  /**
   * Use this method to close an open topic in a forum supergroup chat.
   * For this to work, the bot must be a chat administrator and have the `can_manage_topics` administrator right, unless it is the topic author.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_thread_id Forum topic identifier
   * @returns `True` on success
   */
  public async closeForumTopic(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.closeForumTopic({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Use this method to reopen a closed topic in a forum supergroup chat.
   * For this to work, the bot must be a chat administrator and have the `can_manage_topics` administrator right, unless it is the topic author.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_thread_id Forum topic identifier
   * @returns `True` on success
   */
  public async reopenForumTopic(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.reopenForumTopic({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Use this method to delete a forum topic along with all its messages in a forum supergroup chat or in a private chat with a user. 
   * In the case of a supergroup chat, the bot must be a chat administrator for this to work and must have the `can_delete_messages` administrator right. 
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_thread_id Forum topic identifier
   * @returns `True` on success
   */
  public async deleteForumTopic(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.deleteForumTopic({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Use this method to clear the list of pinned messages in a forum topic in a forum supergroup chat or in a private chat with a user. 
   * In the case of a supergroup chat, the bot must be a chat administrator for this to work and must have the `can_pin_messages` administrator right in the supergroup. 
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param message_thread_id Forum topic identifier
   * @returns `True` on success
   */
  public async unpinAllForumTopicMessages(chat_id: string | number, message_thread_id: number): Promise<boolean> {
    return this.client.raw.unpinAllForumTopicMessages({
      chat_id,
      message_thread_id
    });
  }

  /**
   * Use this method to edit the name of the "General" topic in a forum supergroup chat.
   * For this to work, the bot must be a chat administrator and have the `can_manage_topics` administrator right.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param name New forum topic name
   * @returns `True` on success
   */
  public async editGeneralForumTopic(chat_id: string | number, name: string): Promise<boolean> {
    return this.client.raw.editGeneralForumTopic({
      chat_id,
      name
    });
  }

  /**
   * Use this method to close an open "General" topic in a forum supergroup chat.
   * For this to work, the bot must be a chat administrator and have the `can_manage_topics` administrator right.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async closeGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.closeGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Use this method to reopen a closed "General" topic in a forum supergroup chat.
   * For this to work, the bot must be a chat administrator and have the `can_manage_topics` administrator right.
   * The topic will be automatically shown if it was hidden.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async reopenGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.reopenGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Use this method to hide the "General" topic in a forum supergroup chat.
   * For this to work, the bot must be a chat administrator and have the `can_manage_topics` administrator right.
   * The topic will be automatically closed if it was open.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async hideGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.hideGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Use this method to unhide the "General" topic in a forum supergroup chat.
   * For this to work, the bot must be a chat administrator and have the `can_manage_topics` administrator right.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async unhideGeneralForumTopic(chat_id: string | number): Promise<boolean> {
    return this.client.raw.unhideGeneralForumTopic({
      chat_id
    });
  }

  /**
   * Use this method to clear the list of pinned messages in a General forum topic.
   * For this to work, the bot must be a chat administrator and have the `can_pin_messages` administrator right in the supergroup.
   * Returns `True` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @returns `True` on success
   */
  public async unpinAllGeneralForumTopicMessages(chat_id: string | number): Promise<boolean> {
    return this.client.raw.unpinAllGeneralForumTopicMessages({
      chat_id
    });
  }

  /**
   * Use this method to send answers to callback queries sent from inline keyboards. 
   * The answer will be displayed to the user as a notification at the top of the chat screen or as an alert. 
   * Returns `True` on success.
   * 
   * Alternatively, the user can be redirected to a specified game URL. 
   * For this option to work, you must first create a game for your bot via `@BotFather` and accept the terms. 
   * Otherwise, you can use links like `t.me/your_bot?start=XXXX` which open your bot with a parameter.
   * 
   * @param callback_query_id Unique query identifier
   * @param options Additional response parameters (text, show_alert, url, etc.)
   * @returns `True` on success
   */
  public async answerCallbackQuery(callback_query_id: string, options?: Omit<AnswerCallbackQueryParams, 'callback_query_id'>): Promise<boolean> {
    return this.client.raw.answerCallbackQuery({
      callback_query_id,
      ...options
    });
  }

  /**
   * Use this method to reply to a received guest query. 
   * On success, a `SentGuestMessage` object is returned.
   * 
   * @param guest_query_id Unique query identifier
   * @param result Serialized JSON object describing the message to be sent.
   * @returns `SentGuestMessage`
   */
  public async answerGuestQuery(guest_query_id: string, result: InlineQueryResult): Promise<SentGuestMessage> {
    return this.client.raw.answerGuestQuery({
      guest_query_id,
      result
    });
  }

  /**
   * Use this method to get information about boosts provided by a chat user.
   * Returns `UserChatBoosts` on success.
   * 
   * @param chat_id Unique identifier for the target chat
   * @param user_id Unique user identifier
   * @returns `UserChatBoosts`
   */
  public async getUserChatBoosts(chat_id: string | number, user_id: number): Promise<UserChatBoosts> {
    return this.client.raw.getUserChatBoosts({
      chat_id,
      user_id
    });
  }

  /**
   * Use this method to get information about the bot's connection to a business account.
   * Returns a `BusinessConnection` object on success.
   * 
   * @param business_connection_id Unique business connection identifier
   * @returns `BusinessConnection` with connection information
   */
  public async getBusinessConnection(business_connection_id: string): Promise<BusinessConnection> {
    return this.client.raw.getBusinessConnection({
      business_connection_id
    });
  }

  /**
   * Use this method to get a managed bot token.
   * Returns the token as a string on success.
   * 
   * @param user_id Unique user identifier (managed bot)
   * @returns `string` token as a string
   */
  public async getManagedBotToken(user_id: number): Promise<string> {
    return this.client.raw.getManagedBotToken({
      user_id
    });
  }

  /**
   * Use this method to revoke the current managed bot token and generate a new one.
   * Returns the new token as a string on success.
   * 
   * @param user_id Unique user identifier (managed bot)
   * @returns New token as a string
   */
  public async replaceManagedBotToken(user_id: number): Promise<string> {
    return this.client.raw.replaceManagedBotToken({
      user_id
    });
  }

  /**
   * Use this method to get managed bot access settings.
   * Returns a `BotAccessSettings` object on success.
   * 
   * @param user_id Unique user identifier (managed bot)
   * @returns `BotAccessSettings` with access settings
   */
  public async getManagedBotAccessSettings(user_id: number): Promise<BotAccessSettings> {
    return this.client.raw.getManagedBotAccessSettings({
      user_id
    });
  }

  /**
   * Use this method to change managed bot access settings.
   * Returns `True` on success.
   * 
   * @param user_id Unique user identifier (managed bot)
   * @param is_access_restricted `True` if only selected users have access to the bot. The bot owner always has access.
   * @param options Additional parameters (see `SetManagedBotAccessSettingsParams`)
   * @returns `True` on success
   */
  public async setManagedBotAccessSettings(user_id: number, is_access_restricted: boolean, options?: Omit<SetManagedBotAccessSettingsParams, 'user_id' | 'is_access_restricted'>): Promise<boolean> {
    return this.client.raw.setManagedBotAccessSettings({
      user_id,
      is_access_restricted,
      ...options
    });
  }

  /**
   * Use this method to get recent messages from a given user's personal chat.
   * Returns an array of `Message` objects on success.
   * 
   * @param user_id Unique user identifier
   * @param limit Maximum number of messages to return; 1-20
   * @returns Array of `Message` objects
   */
  public async getUserPersonalChatMessages(user_id: number, limit: number): Promise<Message[]> {
    return this.client.raw.getUserPersonalChatMessages({
      user_id,
      limit
    });
  }

  /**
   * Use this method to change the list of bot commands.
   * See this [guide](https://core.telegram.org/bots/features#commands) for more information about bot commands.
   * Returns `True` on success.
   * 
   * @param commands List of commands for the bot (max 100)
   * @param options Additional parameters (scope, language_code)
   * @returns `True` on success
   */
  public async setMyCommands(commands: BotCommand[], options?: Omit<SetMyCommandsParams, 'commands'>): Promise<boolean> {
    return this.client.raw.setMyCommands({
      commands,
      ...options
    });
  }

  /**
   * Use this method to delete the list of bot commands for a given scope and user language.
   * After deletion, [higher-level commands](https://core.telegram.org/bots/api#determining-list-of-commands) will be shown to affected users.
   * Returns `True` on success.
   * 
   * @param options Additional parameters (scope, language_code)
   * @returns `True` on success
   */
  public async deleteMyCommands(options?: DeleteMyCommandsParams): Promise<boolean> {
    return this.client.raw.deleteMyCommands({
      ...options
    });
  }

  /**
   * Use this method to get the current list of bot commands for a given scope and user language.
   * Returns an array of [BotCommand](https://core.telegram.org/bots/api#botcommand) objects.
   * If commands are not set, an empty list is returned.
   * 
   * @param options Additional parameters (scope, language_code)
   * @returns Array of [BotCommand](https://core.telegram.org/bots/api#botcommand) objects
   */
  public async getMyCommands(options?: GetMyCommandsParams): Promise<BotCommand[]> {
    return this.client.raw.getMyCommands({
      ...options
    });
  }

  /**
   * Use this method to change the bot's name.
   * Returns `True` on success.
   * 
   * @param options Additional parameters (name, language_code)
   * @returns `True` on success
   */
  public async setMyName(options?: SetMyNameParams): Promise<boolean> {
    return this.client.raw.setMyName({
      ...options
    });
  }

  /**
   * Use this method to get the current bot name for a given user language.
   * Returns [BotName](https://core.telegram.org/bots/api#botname) on success.
   * 
   * @param options Additional parameters (`language_code`)
   * @returns `BotName` object on success
   */
  public async getMyName(options?: GetMyNameParams): Promise<BotName> {
    return this.client.raw.getMyName({
      ...options
    });
  }

  /**
   * Use this method to change the bot's description, which is displayed in the chat with the bot if the chat is empty.
   * Returns `True` on success.
   * 
   * @param options Additional parameters (description, language_code)
   * @returns `True` on success
   */
  public async setMyDescription(options?: SetMyDescriptionParams): Promise<boolean> {
    return this.client.raw.setMyDescription({
      ...options
    });
  }

  /**
   * Use this method to get the current bot description for a given user language.
   * Returns `BotDescription` on success.
   * 
   * @param options Additional parameters (`language_code`)
   * @returns `BotDescription` object on success
   */
  public async getMyDescription(options?: GetMyDescriptionParams): Promise<BotDescription> {
    return this.client.raw.getMyDescription({
      ...options
    });
  }

  /**
   * Use this method to change the bot's short description, which is displayed on the bot's profile page and sent with a link when users share the bot.
   * Returns `True` on success.
   * 
   * @param options Additional parameters (short_description, language_code)
   * @returns `True` on success
   */
  public async setMyShortDescription(options?: SetMyShortDescriptionParams): Promise<boolean> {
    return this.client.raw.setMyShortDescription({
      ...options
    });
  }

  /**
   * Use this method to get the current bot short description for a given user language.
   * Returns `BotShortDescription` on success.
   * 
   * @param options Additional parameters (`language_code`)
   * @returns `BotShortDescription` object on success
   */
  public async getMyShortDescription(options?: GetMyShortDescriptionParams): Promise<BotShortDescription> {
    return this.client.raw.getMyShortDescription({
      ...options
    });
  }

  /**
   * Use this method to change the bot's profile photo.
   * Returns `True` on success.
   * 
   * @param photo Bot profile photo
   * @returns `True` on success
   */
  public async setMyProfilePhoto(photo: InputProfilePhoto): Promise<boolean> {
    return this.client.raw.setMyProfilePhoto({
      photo
    });
  }

  /**
   * Use this method to delete the bot's profile photo.
   * Returns `True` on success.
   * 
   * @returns `True` on success
   */
  public async removeMyProfilePhoto(): Promise<boolean> {
    return this.client.raw.removeMyProfilePhoto();
  }

  /**
   * Use this method to change the bot's menu button in a private chat or the default menu button.
   * Returns `True` on success.
   * 
   * @param options Additional parameters (chat_id, menu_button)
   * @returns `True` on success
   */
  public async setChatMenuButton(options?: SetChatMenuButtonParams): Promise<boolean> {
    return this.client.raw.setChatMenuButton({
      ...options
    });
  }

  /**
   * Use this method to get the current value of the bot's menu button in a private chat or the default menu button.
   * Returns `MenuButton` on success.
   * 
   * @param chat_id Chat identifier
   * @returns `MenuButton` object on success
   */
  public async getChatMenuButton(chat_id?: number): Promise<MenuButton> {
    return this.client.raw.getChatMenuButton({
      chat_id
    });
  }

  /**
   * Use this method to change the default administrator rights requested by the bot when it is added as an administrator to groups or channels.
   * These rights will be proposed to users, but they can change the list before adding the bot.
   * Returns `True` on success.
   * 
   * @param options Additional parameters (rights, for_channels)
   * @returns `True` on success
   */
  public async setMyDefaultAdministratorRights(options?: SetMyDefaultAdministratorRightsParams): Promise<boolean> {
    return this.client.raw.setMyDefaultAdministratorRights({
      ...options
    });
  }

  /**
   * Use this method to get the bot's current default administrator rights.
   * Returns `ChatAdministratorRights` on success.
   * 
   * @param options Additional parameters (for_channels)
   * @returns `ChatAdministratorRights` object on success
   */
  public async getMyDefaultAdministratorRights(options?: GetMyDefaultAdministratorRightsParams): Promise<ChatAdministratorRights> {
    return this.client.raw.getMyDefaultAdministratorRights({
      ...options
    });
  }

  /**
   * Returns a list of gifts that the bot can send to users and channel chats.
   * No parameters required.
   * Returns a `Gifts` object on success.
   * 
   * @returns `Gifts` object on success
   */
  public async getAvailableGifts(): Promise<Gifts> {
    return this.client.raw.getAvailableGifts();
  }

  /**
   * Sends a gift to a specified user or channel chat.
   * The recipient cannot convert the gift into Telegram Stars.
   * Returns `True` on success.
   * 
   * @param gift_id Unique gift identifier
   * @param options Additional parameters (chat_id, gift_item_name, user_id)
   * @returns `True` on success
   */
  public async sendGift(gift_id: string, options: Omit<SendGiftParams, "gift_id">): Promise<boolean> {
    return this.client.raw.sendGift({
      gift_id,
      ...options
    });
  }

  /**
   * Gifts a Telegram Premium subscription to a specified user.
   * Returns `True` on success.
   * 
   * @param user_id User identifier
   * @param month_count Number of subscription months
   * @param star_count Number of stars
   * @returns `True` on success
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
   * Verifies a user [on behalf of an organization](https://telegram.org/verify#third-party-verification) represented by the bot.
   * Returns `True` on success.
   * 
   * @param user_id User identifier
   * @param options Additional parameters (status, comment)
   * @returns `True` on success
   */
  public async verifyUser(user_id: number, options?: Omit<VerifyUserParams, "user_id">): Promise<boolean> {
    return this.client.raw.verifyUser({
      user_id,
      ...options
    });
  }

  /**
   * Verifies a chat [on behalf of an organization](https://telegram.org/verify#third-party-verification) represented by the bot.
   * Returns `True` on success.
   * 
   * @param chat_id Chat identifier
   * @param options Additional parameters (custom_description)
   * @returns `True` on success
   */
  public async verifyChat(chat_id: number, options?: Omit<VerifyChatParams, "chat_id">): Promise<boolean> {
    return this.client.raw.verifyChat({
      chat_id,
      ...options
    });
  }

  /**
   * Revokes a user verification established by the bot [on behalf of an organization](https://telegram.org/verify#third-party-verification).
   * Returns `True` on success.
   * 
   * @param user_id User identifier
   * @returns `true` on success
   */
  public async removeUserVerification(user_id: number): Promise<boolean> {
    return this.client.raw.removeUserVerification({ user_id });
  }

  /**
   * Revokes a chat verification established by the bot [on behalf of an organization](https://telegram.org/verify#third-party-verification).
   * Returns `True` on success.
   * 
   * @param chat_id Chat identifier
   * @returns `True` on success
   */
  public async removeChatVerification(chat_id: string | number): Promise<boolean> {
    return this.client.raw.removeChatVerification({
      chat_id
    });
  }

  /**
   * Marks an incoming message as read on behalf of a business account.
   * Requires the business bot right `can_read_messages`.
   * Returns `True` on success.
   * 
   * @param business_connection_id Business account identifier
   * @param chat_id Chat identifier
   * @param message_id Message identifier
   * @returns `True` on success
   */
  public async readBusinessMessage(business_connection_id: string, chat_id: number, message_id: number): Promise<boolean> {
    return this.client.raw.readBusinessMessage({
      business_connection_id,
      chat_id,
      message_id
    });
  }

  /**
   * Deletes messages on behalf of a business account.
   * Requires the business bot right `can_delete_sent_messages` to delete messages sent by the bot itself, or `can_delete_all_messages` to delete any message.
   * Returns `True` on success.
   * 
   * @param business_connection_id Business account identifier
   * @param message_ids Message identifiers
   * @returns `True` on success
   */
  public async deleteBusinessMessages(business_connection_id: string, message_ids: number[]): Promise<boolean> {
    return this.client.raw.deleteBusinessMessages({
      business_connection_id,
      message_ids
    });
  }

  /**
   * Changes the first and last name of a managed business account.
   * Requires the business bot right `can_change_name`.
   * Returns `True` on success.
   * 
   * @param business_connection_id Business account identifier
   * @param first_name New first name of the managed business account
   * @param options Additional parameters (last_name)
   * @returns `True` on success
   */
  public async setBusinessAccountName(business_connection_id: string, first_name: string, options?: Omit<SetBusinessAccountNameParams, "business_connection_id" | "first_name">): Promise<boolean> {
    return this.client.raw.setBusinessAccountName({
      business_connection_id,
      first_name,
      ...options
    });
  }

  /**
   * Changes the username of a managed business account.
   * Requires the business bot right `can_change_username`. 
   * On success, returns `True`.
   *
   * @param business_connection_id Business account identifier
   * @param options Additional parameters (username)
   * @returns `True` on success
   */
  public async setBusinessAccountUsername(business_connection_id: string, options?: Omit<SetBusinessAccountUsernameParams, "business_connection_id">): Promise<boolean> {
    return this.client.raw.setBusinessAccountUsername({
      business_connection_id,
      ...options
    });
  }

  /**
   * Changes the bio of a managed business account.
   * Requires the business bot right `can_change_bio`.
   * Returns `True` on success.
   *
   * @param business_connection_id Business account identifier
   * @param options Additional parameters (bio)
   * @returns `True` on success
   */
  public async setBusinessAccountBio(business_connection_id: string, options?: Omit<SetBusinessAccountBioParams, "business_connection_id">): Promise<boolean> {
    return this.client.raw.setBusinessAccountBio({
      business_connection_id,
      ...options
    });
  }

  /**
   * Changes the profile photo of a managed business account.
   * Requires the business bot right `can_edit_profile_photo`.
   * Returns `True` on success.
   *
   * @param business_connection_id Business account identifier
   * @param photo Managed business account photo
   * @param options Additional parameters (photo)
   * @returns `True` on success
   */
  public async setBusinessAccountProfilePhoto(business_connection_id: string, photo: InputProfilePhoto, options?: Omit<SetBusinessAccountProfilePhotoParams, "business_connection_id" | "photo">): Promise<boolean> {
    return this.client.raw.setBusinessAccountProfilePhoto({
      business_connection_id,
      photo,
      ...options
    });
  }

  /**
   * Deletes the current profile photo of a managed business account.
   * Requires the business bot right `can_edit_profile_photo`.
   * Returns `True` on success.
   *
   * @param business_connection_id Business account identifier
   * @returns `True` on success
   */
  public async removeBusinessAccountProfilePhoto(business_connection_id: string, options?: Omit<RemoveBusinessAccountProfilePhotoParams, "business_connection_id">): Promise<boolean> {
    return this.client.raw.removeBusinessAccountProfilePhoto({
      business_connection_id,
      ...options
    });
  }

  /**
   * Changes the privacy settings regarding incoming gifts in a managed business account.
   * Requires the business bot right `can_change_gift_settings`.
   * Returns `True` on success.
   *
   * @param business_connection_id Business account identifier
   * @param show_gift_button Show gift button
   * @param accepted_gift_types Accepted gift types
   * @returns `True` on success
   */
  public async setBusinessAccountGiftSettings(business_connection_id: string, show_gift_button: boolean, accepted_gift_types: AcceptedGiftTypes): Promise<boolean> {
    return this.client.raw.setBusinessAccountGiftSettings({
      business_connection_id,
      show_gift_button,
      accepted_gift_types
    });
  }

  /**
   * Returns the number of Telegram Stars belonging to a managed business account.
   * Requires the business bot right `can_view_gifts_and_stars`.
   * Returns `StarAmount` on success.
   *
   * @param business_connection_id Business account identifier
   * @returns Number of stars
   */
  public async getBusinessAccountStarBalance(business_connection_id: string): Promise<StarAmount> {
    return this.client.raw.getBusinessAccountStarBalance({
      business_connection_id
    });
  }

  /**
   * Transfers Telegram Stars from a business account balance to the bot balance.
   * Requires the business bot right `can_transfer_stars`.
   * Returns `True` on success.
   *
   * @param business_connection_id Business account identifier
   * @param star_count Number of stars to transfer
   * @returns `True` on success
   */
  public async transferBusinessAccountStars(business_connection_id: string, star_count: number): Promise<boolean> {
    return this.client.raw.transferBusinessAccountStars({
      business_connection_id,
      star_count
    });
  }

  /**
   * Returns received gifts belonging to a managed business account.
   * Requires the business bot right `can_view_gifts_and_stars`.
   * Returns `OwnedGifts` on success.
   *
   * @param business_connection_id Business account identifier
   * @param options Additional parameters
   * @returns Received gifts
   */
  public async getBusinessAccountGifts(business_connection_id: string, options?: Omit<GetBusinessAccountGiftsParams, "business_connection_id">): Promise<OwnedGifts> {
    return this.client.raw.getBusinessAccountGifts({
      business_connection_id,
      ...options
    });
  }

  /**
   * Returns gifts owned and displayed by a user.
   * Returns `OwnedGifts` on success.
   *
   * @param user_id User identifier
   * @param options Additional parameters
   * @returns Received gifts
   */
  public async getUserGifts(user_id: number, options?: Omit<GetUserGiftsParams, "user_id">): Promise<OwnedGifts> {
    return this.client.raw.getUserGifts({
      user_id,
      ...options
    });
  }

  /**
   * Returns gifts belonging to a chat.
   * Returns `OwnedGifts` on success.
   *
   * @param chat_id Chat identifier with the user
   * @param options Additional parameters
   * @returns Received gifts
   */
  public async getChatGifts(chat_id: number | string, options?: Omit<GetChatGiftsParams, "chat_id">): Promise<OwnedGifts> {
    return this.client.raw.getChatGifts({
      chat_id,
      ...options
    });
  }

  /**
   * Converts a regular gift into Telegram Stars.
   * Requires the business bot right `can_convert_gifts_to_stars`.
   * On success, returns `True`.
   *
   * @param business_connection_id Business account identifier
   * @param owned_gift_id Gift identifier
   * @returns `True` on success
   */
  public async convertGiftToStars(business_connection_id: string, owned_gift_id: string): Promise<boolean> {
    return this.client.raw.convertGiftToStars({
      business_connection_id,
      owned_gift_id
    });
  }

  /**
   * Upgrades a regular gift to a unique one.
   * Requires the business bot right `can_transfer_and_upgrade_gifts`.
   * Additionally requires the business bot right `can_transfer_stars` if the upgrade is paid.
   * Returns `True` on success.
   *
   * @param business_connection_id Business account identifier
   * @param owned_gift_id Gift identifier
   * @returns `True` on success
   */
  public async upgradeGift(business_connection_id: string, owned_gift_id: string, options?: Omit<UpgradeGiftParams, "business_connection_id" | "owned_gift_id">): Promise<boolean> {
    return this.client.raw.upgradeGift({
      business_connection_id,
      owned_gift_id,
      ...options
    });
  }

  /**
   * Transfers an owned unique gift to another user.
   * Requires the business bot right `can_transfer_and_upgrade_gifts`.
   * Requires the business bot right `can_transfer_stars` if the transfer is paid.
   * Returns `True` on success.
   *
   * @param business_connection_id Business account identifier
   * @param owned_gift_id Gift identifier
   * @param new_owner_chat_id New owner's chat identifier
   * @param options Additional parameters
   * @returns `True` on success
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
   * Posts a story on behalf of a managed business account.
   * Requires the business bot right `can_manage_stories`.
   * Returns `Story` on success.
   *  
   * @param business_connection_id Unique business connection identifier
   * @param content Story content
   * @param active_period Story duration (from 1 to 72 hours)
   * @param options Additional parameters
   * @returns `Story` on success
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
   * Reposts a story on behalf of a business account from another business account.
   * Both business accounts must be managed by the same bot, and the story in the source account must be published (or reposted) by the bot.
   * Requires the business bot right `can_manage_stories` for both business accounts.
   * Returns `Story` on success.
   *
   * @param business_connection_id Business account identifier.
   * @param from_chat_id Source chat identifier.
   * @param from_story_id Source story identifier.
   * @param active_period Story duration.
   * @param options Additional parameters.
   * @returns `Story` on success.
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
   * Edits a story previously published by the bot on behalf of a managed business account.
   * Requires the business bot right `can_manage_stories`.
   * Returns `Story` on success.
   *
   * @param business_connection_id Unique business connection identifier
   * @param story_id Story identifier
   * @param content Story content
   * @param options Additional parameters
   * @returns `Story` on success
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
   * Deletes a story previously published by the bot on behalf of a managed business account.
   * Requires the business bot right `can_manage_stories`.
   * On success, returns `True`.
   *
   * @param business_connection_id Unique business connection identifier
   * @param story_id Story identifier
   * @returns `True` on success
   */
  public async deleteStory(business_connection_id: string, story_id: number): Promise<boolean> {
    return this.client.raw.deleteStory({
      business_connection_id,
      story_id
    });
  }

  /**
   * Use this method to set the result of an interaction with a web application and send a corresponding message on behalf of the user to the chat from which the query originated.
   * On success, a `SentWebAppMessage` object is returned.
   * 
   * @param web_app_query_id Web App query identifier.
   * @param result Web application interaction result.
   * @returns `SentWebAppMessage`.
   */
  public async answerWebAppQuery(web_app_query_id: string, result: InlineQueryResult): Promise<SentWebAppMessage> {
    return this.client.raw.answerWebAppQuery({
      web_app_query_id,
      result
    });
  }

  /**
 * Saves a message that can be sent by a mini-app user.
 * Returns a `PreparedInlineMessage` object.
 *
 * @param user_id User identifier
 * @param result Inline query result
 * @returns `PreparedInlineMessage` with the prepared message ID
 */

  public async savePreparedInlineMessage(user_id: number, result: InlineQueryResult, options?: Omit<SavePreparedInlineMessageParams, 'user_id' | 'result'>): Promise<PreparedInlineMessage> {
    return this.client.raw.savePreparedInlineMessage({
      user_id,
      result,
      ...options
    });
  }

  /**
 * Saves a keyboard button that can be used by a mini-app user.
 * Returns a `PreparedKeyboardButton` object.
 *
 * @param user_id User identifier
 * @param button Keyboard button
 * @returns `PreparedKeyboardButton` with the prepared button ID
 */

  public async savePreparedKeyboardButton(user_id: number, button: KeyboardButton): Promise<PreparedKeyboardButton> {
    return this.client.raw.savePreparedKeyboardButton({
      user_id,
      button
    });
  }

  /**
   * Helper method for normalizing message ID when editing.
   */
  private getEditIds(id: { chat_id: number | string; message_id: number } | string) {
    return typeof id === 'string'
      ? { inline_message_id: id }
      : { chat_id: id.chat_id, message_id: id.message_id };
  }



  /**
 * Edits a text message or inline message text.
 *
 * @param id Message identifier (either chat_id and message_id, or inline_message_id)
 * @param text New message text
 * @param options Additional parameters
 * @returns Edited message
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
 * Use this method to edit message captions.
 * On success, if the edited message is not an inline message, the edited message is returned, otherwise `True` is returned.
 * Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours of being sent.
 *
 * @param id Message identifier (either chat_id and message_id, or inline_message_id)
 * @param options Additional parameters (caption, parse_mode, etc.)
 * @returns Edited message or `True` if editing was successful
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
   * Use this method to edit animation, audio, document, photo, or video messages, or to add media files to text messages.
   * If a message is part of a message album, it can only be edited as audio for audio albums, only as a document for document albums, and as a photo or video in other cases.
   * When editing an inline message, a new file cannot be uploaded; use a previously uploaded file via its `file_id` or specify a URL.
   * On success, if the edited message is not an inline message, the edited message is returned, otherwise `True` is returned.
   * Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours of being sent.
   * 
   * @param id Message identifier. Can be an object with `chat_id` and `message_id` or an `inline_message_id` string.
   * @param options Media message editing parameters. Must include `media` (InputMediaVideo/InputMediaAnimation/InputMediaAudio/InputMediaPhoto).
   * @returns Edited message or `True` on success.
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
 * Use this method to edit live location messages.
 * A location can be edited until its `live_period` expires or editing is explicitly prohibited by calling `stopMessageLiveLocation`.
 * On success, if the edited message is not an inline message, the edited `Message` is returned, otherwise `True` is returned.
 * 
 * @param id Message identifier. Can be an object with `chat_id` and `message_id` or an `inline_message_id` string.
 * @param latitude New location latitude
 * @param longitude New location longitude
 * @param options Additional parameters
 * @returns Edited message or `True` on success.
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
 * Use this method to stop updating a live location message before `live_period` expires.
 * On success, if the message is not an inline message, the edited message is returned, otherwise `True` is returned. 
 * 
 * @param id Message identifier. Can be an object with `chat_id` and `message_id` or an `inline_message_id` string.
 * @param options Additional parameters
 * @returns Edited message or `True` on success.
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
   * Use this method to edit a checklist on behalf of a connected business account.
   * On success, the edited message is returned.
   * 
   * @param business_connection_id Business connection identifier.
   * @param chat_id Chat identifier.
   * @param message_id Message identifier.
   * @param checklist New checklist.
   * @param options Additional parameters
   * @returns Edited message on success.
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
   * Use this method to edit only the reply markup of messages.
   * On success, if the edited message is not an inline message, the edited message is returned, otherwise `True` is returned.
   * Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours of being sent.
   * 
   * @param id Message identifier. Can be an object with `chat_id` and `message_id` or an `inline_message_id` string.
   * @param options Additional parameters.
   * @returns Edited message or `True` on success.
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
   * Use this method to stop a poll.
   * On success, the updated poll is returned.
   * 
   * @param chat_id Chat identifier or username.
   * @param message_id Message identifier with the poll.
   * @param options Additional parameters.
   * @returns Updated poll.
   */
  public async stopPoll(chat_id: number | string, message_id: number, options?: Omit<StopPollParams, 'chat_id' | 'message_id'>): Promise<Poll> {
    return this.client.raw.stopPoll({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Use this method to approve a suggested post in a direct message chat.
   * The bot must have the `can_post_messages` administrator right in the corresponding channel chat.
   * Returns `True` on success.
   * 
   * @param chat_id Chat identifier or username.
   * @param message_id Suggested post identifier.
   * @returns `True` on success.
   */
  public async approveSuggestedPost(chat_id: number, message_id: number, options?: Omit<ApproveSuggestedPostParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.approveSuggestedPost({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Use this method to decline a suggested post in a direct message chat.
   * The bot must have the `can_manage_direct_messages` administrator right in the corresponding channel chat.
   * Returns `True` on success.
   * 
   * @param chat_id Chat identifier.
   * @param message_id Suggested post identifier.
   * @returns `True` on success.
   */
  public async declineSuggestedPost(chat_id: number, message_id: number, options?: Omit<DeclineSuggestedPostParams, 'chat_id' | 'message_id'>): Promise<boolean> {
    return this.client.raw.declineSuggestedPost({
      chat_id,
      message_id,
      ...options
    });
  }

  /**
   * Use this method to delete a message, including service messages, with the following restrictions:
   * - A message can only be deleted if it was sent less than 48 hours ago.
   * - Service messages about creating a supergroup, channel, or forum topic cannot be deleted.
   * - A `dice` message in a private chat can only be deleted if it was sent more than 24 hours ago.
   * - Bots can delete outgoing messages in private chats, groups, and supergroups.
   * - Bots can delete incoming messages in private chats.
   * - Bots granted the `can_post_messages` permission can delete outgoing messages in channels.
   * - If the bot is a group administrator, it can delete any message there.
   * - If the bot has the `can_delete_messages` administrator right in a supergroup or channel, it can delete any message there.
   * - If the bot has the `can_manage_direct_messages` administrator right in a channel, it can delete any message in the corresponding direct message chat.
   * Returns `True` on success.
   * 
   * @param chat_id Chat identifier or username.
   * @param message_id Message identifier.
   * @returns `True` on success.
   */
  public async deleteMessage(chat_id: number | string, message_id: number): Promise<boolean> {
    return this.client.raw.deleteMessage({
      chat_id,
      message_id,
    });
  }

  /**
   * Use this method to delete multiple messages at once.
   * If some of the specified messages cannot be found, they are skipped.
   * Returns `True` on success.
   * 
   * @param chat_id Chat identifier or username.
   * @param message_ids Message identifiers.
   * @returns `True` on success.
   */
  public async deleteMessages(chat_id: number | string, message_ids: number[]): Promise<boolean> {
    return this.client.raw.deleteMessages({
      chat_id,
      message_ids,
    });
  }

  /**
   * Use this method to send static `.WEBP`, animated `.TGS`, or video `.WEBM` stickers.
   * On success, the sent message is returned.
   * 
   * @param chat_id Chat identifier or username.
   * @param sticker Sticker to send. Can be `file_id`, `url`, or `InputFile`.
   * @param options Additional parameters.
   * @returns Sent message.
   */
  public async sendSticker(chat_id: number | string, sticker: string | InputFile, options?: Omit<SendStickerParams, 'chat_id' | 'sticker'>): Promise<Message> {
    return this.client.raw.sendSticker({
      chat_id,
      sticker,
      ...options
    });
  }

  /**
   * Use this method to get a sticker set.
   * On success, a `StickerSet` object is returned.
   * 
   * @param name Sticker set name.
   * @returns `StickerSet`.
   */
  public async getStickerSet(name: string): Promise<StickerSet> {
    return this.client.raw.getStickerSet({ name });
  }

  /**
   * Use this method to get information about custom emoji stickers by their identifiers.
   * Returns an array of `Sticker` objects.
   *

   * @param custom_emoji_ids Sticker identifiers.
   * @returns Array of `Sticker` objects.
   */
  public async getCustomEmojiStickers(custom_emoji_ids: string[]): Promise<Sticker[]> {
    return this.client.raw.getCustomEmojiStickers({ custom_emoji_ids });
  }

  /**
   * Use this method to upload a sticker file for subsequent use in `createNewStickerSet`, `addStickerToSet`, or `replaceStickerInSet` methods (the file can be used multiple times).
   * Returns the uploaded file on success.
   * 
   * @param user_id User identifier.
   * @param sticker Sticker to upload. Can be a `string` (file_id) or `InputFile`.
   * @param sticker_format Sticker format. Can be `'static'`, `'animated'`, or `'video'`.
   * @returns `File` object.
   */
  public async uploadStickerFile(user_id: number, sticker: string | InputFile, sticker_format: 'static' | 'animated' | 'video'): Promise<TelegramFile> {
    return this.client.raw.uploadStickerFile({ user_id, sticker, sticker_format });
  }

  /**
   * Use this method to create a new sticker set belonging to a user.
   * The bot will be able to edit a sticker set created this way.
   * Returns `True` on success.
   * 
   * @param user_id User identifier.
   * @param name Sticker set name. Must start with `a-z`, `A-Z`, or `0-9`, and can contain `_` and consist of no more than 64 characters.
   * @param title Sticker set title. Must consist of no more than 64 characters.
   * @param stickers Array of stickers to add. At least one sticker must be passed.
   * @param options Additional parameters.
   * @returns `True` on success.
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
   * Use this method to add a new sticker to a sticker set. 
   * Returns `True` on success.
   * 
   * @param user_id User identifier creating the sticker set.
   * @param name Sticker set name.
   * @param sticker Sticker to add. Must be an `InputSticker` object.
   * @returns `True` on success.
   */
  public async addStickerToSet(user_id: number, name: string, sticker: InputSticker): Promise<boolean> {
    return this.client.raw.addStickerToSet({
      user_id,
      name,
      sticker
    });
  }

  /**
   * Use this method to move a sticker from a set created by the bot to a specific position.
   * Returns `True` on success.
   * 
   * @param sticker Sticker identifier.
   * @param position New sticker position.
   * @returns `True` on success.
   */
  public async setStickerPositionInSet(sticker: string, position: number): Promise<boolean> {
    return this.client.raw.setStickerPositionInSet({
      sticker,
      position
    });
  }

  /**
   * Use this method to delete a sticker from a sticker set.
   * Returns `True` on success.
   * 
   * @param sticker Sticker identifier.
   * @returns `True` on success.
   */
  public async deleteStickerFromSet(sticker: string): Promise<boolean> {
    return this.client.raw.deleteStickerFromSet({
      sticker
    });
  }

  /**
   * Use this method to replace a sticker in a sticker set.
   * Returns `True` on success.
   * 
   * @param user_id User identifier creating the sticker set.
   * @param name Sticker set name.
   * @param old_sticker Identifier of the sticker to be replaced.
   * @param sticker New sticker. Must be an `InputSticker` object.
   * @returns `True` on success.
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
   * Use this method to change the list of emojis assigned to a regular or custom emoji sticker.
   * The sticker must belong to a sticker set created by the bot.
   * Returns `True` on success.
   * 
   * @param sticker Sticker identifier.
   * @param emoji_list List of emojis.
   * @returns `True` on success.
   */
  public async setStickerEmojiList(sticker: string, emoji_list: string[]): Promise<boolean> {
    return this.client.raw.setStickerEmojiList({
      sticker,
      emoji_list
    });
  }

  /**
   * Use this method to change the list of keywords assigned to a regular or custom emoji sticker.
   * The sticker must belong to a sticker set created by the bot.
   * Returns `True` on success.
   * 
   * @param sticker Sticker identifier.
   * @param keywords List of keywords.
   * @returns `True` on success.
   */
  public async setStickerKeywords(sticker: string, keywords: string[]): Promise<boolean> {
    return this.client.raw.setStickerKeywords({
      sticker,
      keywords
    });
  }

  /**
   * Use this method to change the mask position of a sticker.
   * The sticker must belong to a set created by the bot.
   * Returns `True` on success.
   * 
   * @param sticker Sticker identifier.
   * @param options Additional parameters.
   * @returns `True` on success.
   */
  public async setStickerMaskPosition(sticker: string, options?: Omit<SetStickerMaskPositionParams, 'sticker'>): Promise<boolean> {
    return this.client.raw.setStickerMaskPosition({
      sticker,
      ...options
    });
  }

  /**
   * Use this method to set the title of a created sticker set.
   * Returns `True` on success.
   * 
   * @param name Sticker set name.
   * @param title New sticker set title.
   * @returns `True` on success.
   */
  public async setStickerSetTitle(name: string, title: string): Promise<boolean> {
    return this.client.raw.setStickerSetTitle({
      name,
      title
    });
  }

  /**
   * Use this method to set the thumbnail of a regular sticker set or a mask set.
   * The thumbnail file format must match the format of the stickers in the set.
   * Returns `True` on success.
   * 
   * @param name Sticker set name.
   * @param user_id User identifier creating the sticker set.
   * @param format Thumbnail file format.
   * @param options Additional parameters.
   * @returns `True` on success.
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
   * Use this method to set the thumbnail of a custom emoji sticker set.
   * Returns `True` on success.
   * 
   * @param name Sticker set name.
   * @param custom_emoji_id Emoji identifier.
   * @returns `True` on success.
   */
  public async setCustomEmojiStickerSetThumbnail(name: string, custom_emoji_id: string): Promise<boolean> {
    return this.client.raw.setCustomEmojiStickerSetThumbnail({
      name,
      custom_emoji_id
    });
  }

  /**
   * Use this method to delete a sticker set created by the bot.
   * Returns `True` on success.
   * 
   * @param name Sticker set name.
   * @returns `True` on success.
   */
  public async deleteStickerSet(name: string): Promise<boolean> {
    return this.client.raw.deleteStickerSet({
      name
    });
  }

  /**
   * Use this method to send answers to an inline query.
   * Returns `True` on success.
   * No more than 50 results per query are allowed.
   * 
   * @param inline_query_id Inline query identifier.
   * @param results Array of results.
   * @param options Additional parameters.
   * @returns `True` on success.
   */
  public async answerInlineQuery(inline_query_id: string, results: InlineQueryResult[], options?: Omit<AnswerInlineQueryParams, 'inline_query_id' | 'results'>): Promise<boolean> {
    return this.client.raw.answerInlineQuery({
      inline_query_id,
      results,
      ...options
    });
  }

  /**
   * Use this method to send invoices.
   * On success, the sent message is returned.
   *
   * @param chat_id Chat identifier.
   * @param title Invoice title.
   * @param description Invoice description.
   * @param payload Internal invoice information.
   * @param currency Invoice currency.
   * @param prices Invoice prices.
   * @param options Additional parameters.
   * @returns Sent message.
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
   * Use this method to create an invoice link.
   * On success, returns the created invoice link as a string.
   * 
   * @param title Invoice title.
   * @param description Invoice description.
   * @param payload Internal invoice information.
   * @param currency Invoice currency.
   * @param prices Invoice prices.
   * @param options Additional parameters.
   * @returns Created invoice link.
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
   * If you sent an invoice with a shipping address request and the `is_flexible` parameter was specified, the Bot API will send the bot an update with the `shipping_query` field.
   * Use this method to answer shipping queries.
   * Returns `True` on success.
   * 
   * @param shipping_query_id Shipping query identifier.
   * @param ok Whether the response is successful.
   * @param shipping_options Array of shipping options.
   * @returns `True` on success.
   */
  public async answerShippingQuery(shipping_query_id: string, ok: boolean, shipping_options?: ShippingOption[]): Promise<boolean> {
    return this.client.raw.answerShippingQuery({
      shipping_query_id,
      ok,
      shipping_options
    });
  }

  /**
   * After a user has confirmed their payment and shipping data, the Bot API sends a final confirmation as an update with the `pre_checkout_query` field.
   * Use this method to answer such pre-checkout queries.
   * Returns `True` on success.
   * 
   * **Note**: The Bot API must receive a response within 10 seconds after sending a pre-checkout query.
   * 
   * @param pre_checkout_query_id Pre-checkout query identifier.
   * @param ok Whether the response is successful.
   * @param options Additional parameters (error_message)
   * @returns `True` on success.
   */
  public async answerPreCheckoutQuery(pre_checkout_query_id: string, ok: boolean, options?: Omit<AnswerPreCheckoutQueryParams, 'pre_checkout_query_id' | 'ok'>): Promise<boolean> {
    return this.client.raw.answerPreCheckoutQuery({
      pre_checkout_query_id,
      ok,
      ...options
    });
  }

  /**
   * Method to get the current Telegram Stars balance of the bot.
   * Requires no parameters.
   * On success, returns a `StarAmount` object.
   * 
   * @returns `StarAmount` object.
   */
  public async getMyStarBalance(): Promise<StarAmount> {
    return this.client.raw.getMyStarBalance();
  }

  /**
   * Returns the bot's Telegram Star transactions in chronological order.
   * On success, returns a `StarTransactions` object.
   * 
   * @param options Parameters for filtering transactions.
   * @returns `StarTransactions` object with transaction information.
   */
  public async getStarTransactions(options?: GetStarTransactionsParams): Promise<StarTransactions> {
    return this.client.raw.getStarTransactions({
      ...options
    });
  }

  /**
   * Refunds a successful payment in Telegram Stars.
   * Returns `True` on success.
   * 
   * @param user_id User identifier.
   * @param telegram_payment_charge_id Telegram payment transaction identifier.
   * @returns `True` on success.
   */
  public async refundStarPayment(user_id: number, telegram_payment_charge_id: string): Promise<boolean> {
    return this.client.raw.refundStarPayment({ user_id, telegram_payment_charge_id });
  }

  /**
   * Allows the bot to cancel or re-enable the renewal of a subscription paid in Telegram Stars.
   * Returns `True` on success.
   * 
   * @param user_id User identifier.
   * @param telegram_payment_charge_id Telegram payment identifier for the subscription.
   * @param is_canceled Whether the subscription is canceled.
   * @returns `True` on success.
   */
  public async editUserStarSubscription(user_id: number, telegram_payment_charge_id: string, is_canceled: boolean): Promise<boolean> {
    return this.client.raw.editUserStarSubscription({ user_id, telegram_payment_charge_id, is_canceled });
  }

  /**
   * Use this method to send a game.
   * On success, the sent message is returned.
   * 
   * @param chat_id Chat identifier.
   * @param game_short_name Game short name.
   * @param options Additional parameters.
   * @returns `Message` object.
   */
  public async sendGame(chat_id: number, game_short_name: string, options?: Omit<SendGameParams, 'chat_id' | 'game_short_name'>): Promise<Message> {
    return this.client.raw.sendGame({
      chat_id,
      game_short_name,
      ...options
    });
  }

  /**
   * Use this method to set the score of the specified user in a game message.
   * On success, if the message is not an inline message, the `Message` is returned, otherwise `True` is returned.
   * Returns an error if the new score is not greater than the user's current score in the chat and `force` is False.
   * 
   * @param user_id User identifier.
   * @param score Player's score.
   * @param options Additional parameters.
   * @returns `Message` object or `True`.
   */
  public async setGameScore(user_id: number, score: number, options?: Omit<SetGameScoreParams, 'user_id' | 'score'>): Promise<Message | boolean> {
    return this.client.raw.setGameScore({
      user_id,
      score,
      ...options
    });
  }

  /**
   * Use this method to get data for high score tables.
   * Returns the score of the specified user and several of their neighbors in the game.
   * Returns an array of `GameHighScore` objects.
   * 
   * This method will currently return scores for the target user, as well as two of their closest neighbors on each side.
   * It will also return the top three users if the user and their neighbors are not among them.
   * Note that this behavior is subject to change.
   * 
   * @param user_id User identifier.
   * @param options Additional parameters.
   * @returns Array of `GameHighScore` objects with user score information.
   */
  public async getGameHighScores(user_id: number, options?: Omit<GetGameHighScoresParams, 'user_id'>): Promise<GameHighScore[]> {
    return this.client.raw.getGameHighScores({
      user_id,
      ...options
    });
  }

}