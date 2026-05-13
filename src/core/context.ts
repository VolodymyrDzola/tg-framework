import { TelegramBotApi, Update } from "../types/telegram";
import { ReplyContext } from "./context/reply-context";

export class Context extends ReplyContext {
  constructor(update: Update, api: TelegramBotApi) {
    super(update, api);
  }
}
