import { MangadexPulseTopic } from "../constants/topics.js";
import { isAdmin, sendCmdMessage } from "bot-framework";
import { Logger } from "bot-framework"
import { Store } from "../support/store.js";
import { BotCommand } from "../modules/bot.js";
import { MangadexScraper } from "../modules/mangadex_scraper.js";
import { LogLevel } from "bot-framework";

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
        sendCmdMessage(command.message, message, this.logger, LogLevel.INFO);
      } else if (dexStatus?.status === false) {
        let message = `Mangadex unreachable`;
        if (dexStatus.lastUp != null) {
          message += ` since ${dexStatus.lastUp.toUTCString()}`;
        }
        sendCmdMessage(command.message, message, this.logger, LogLevel.INFO);
      } else {
        sendCmdMessage(command.message, 'Mangadex status unknown', this.logger, LogLevel.INFO);
      }

      // Also notify about parsing status
      status = await Store.isMangadexEnabled();
      if (status == true) {
        sendCmdMessage(command.message, 'Mangadex parser is enabled', this.logger, LogLevel.INFO);
      } else {
        sendCmdMessage(command.message, 'Mangadex parser is disabled', this.logger, LogLevel.INFO);
      }
      return;
    case 1:
      // Handle as "set parsing status"
      // Admin only
      if (! await isAdmin(command.message)) {
        sendCmdMessage(command.message, 'Error: not admin', this.logger, LogLevel.INFO);
        return;
      }

      status = command.arguments[0] == 'true';
      
      if (status == true) {
        await MangadexScraper.enable();
      } else {
        await MangadexScraper.disable();
      }

      sendCmdMessage(command.message, `Mangadex parsing status updated to ${status}`, this.logger, LogLevel.INFO);
      return;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    }
  }
}