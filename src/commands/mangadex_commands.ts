import { sendCmdMessage, Logger, LogLevel } from "bot-framework";

import { MangadexPulseTopic } from "../constants/topics.js";
import { BotCommand } from "../modules/bot.js";

export class MangadexCommandHandler {
  
  logger: Logger;

  constructor() {
    this.logger = new Logger("MangadexCommandHandler");
  }

  public dexstatusHandler = async (command: BotCommand): Promise<void> => {
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

      return;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    }
  }
}