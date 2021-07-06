import { sendCmdMessage } from "../../util/bot_utils.js";
import { Logger } from "../../util/logger.js"
import { BotCommand } from "../bot.js";
import { MangadexPulseTopic } from "../mangadex_scraper.js";

export class MangadexCommandHandler {
  
  logger: Logger;

  constructor() {
    this.logger = new Logger("MangadexCommandHandler");
  }

  public dexstatusHandler = async (command: BotCommand): Promise<void> => {
    const dexStatus = MangadexPulseTopic.getLastData()
    if (dexStatus?.status === true) {
      let message = `Mangadex up`;
      if (dexStatus.lastDown != null) {
        message += ` since ${dexStatus.lastDown.toUTCString()}`;
      }
      sendCmdMessage(command.message, message, 2, this.logger);
    } else if (dexStatus?.status === false) {
      let message = `Mangadex unreachable`;
      if (dexStatus.lastUp != null) {
        message += ` since ${dexStatus.lastUp.toUTCString()}`;
      }
      sendCmdMessage(command.message, message, 2, this.logger);
    } else {
      sendCmdMessage(command.message, 'Mangadex status unknown', 2, this.logger);
    }
  }
}