import { MangadexPulseTopic } from "../../constants/topics.js";
import { isAdmin, sendCmdMessage } from "../../framework/bot_utils.js";
import { Logger } from "../../framework/logger.js"
import { Store } from "../../support/store.js";
import { BotCommand } from "../bot.js";
import { MangadexScraper } from "../mangadex_scraper.js";

export class MangadexCommandHandler {
  
  logger: Logger;

  constructor() {
    this.logger = new Logger("MangadexCommandHandler");
  }

  public dexstatusHandler = async (command: BotCommand): Promise<void> => {
    let status = false;
    switch (command.arguments.length) {
    case 0:
      // Get the last known status about Mangadex
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

      // Also notify about parsing status
      status = await Store.isMangadexEnabled();
      if (status == true) {
        sendCmdMessage(command.message, 'Mangadex parser is enabled', 2, this.logger);
      } else {
        sendCmdMessage(command.message, 'Mangadex parser is disabled', 2, this.logger);
      }
      return;
    case 1:
      // Handle as "set parsing status"
      // Admin only
      if (! await isAdmin(command.message)) {
        sendCmdMessage(command.message, 'Error: not admin', 2, this.logger);
        return;
      }

      status = command.arguments[0] == 'true';
      
      if (status == true) {
        await MangadexScraper.enable();
      } else {
        await MangadexScraper.disable();
      }

      sendCmdMessage(command.message, `Mangadex parsing status updated to ${status}`, 2, this.logger);
      return;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', 3, this.logger);
      return;
    }
  }
}