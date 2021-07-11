import { isAdmin, sendCmdMessage, Logger, LogLevel } from "bot-framework";
import { ScraperType, typeFromLowercase } from "../constants/scraper_types.js";

import { BotCommand } from "../modules/bot.js";
import { IScraper } from "../support/base_scraper.js";
import { ScraperHelper } from "../support/scrapers.js";
export class ScraperCommandsHandler {
  
  logger: Logger;

  constructor() {
    this.logger = new Logger("ScraperCommandsHandler");
  }

  public scraperstatusHandler = async (command: BotCommand): Promise<void> => {
    let type: ScraperType = null;
    let scraper: IScraper = null;
    let status = false;
    switch (command.arguments.length) {
    case 1:
      // Lookup type from string
      type = typeFromLowercase(command.arguments[0].toLowerCase());
      if (type == null) {
        sendCmdMessage(command.message, 'Error: invalid type', this.logger, LogLevel.TRACE);
        return;
      }

      scraper = ScraperHelper.getScraperForType(type);
      if (scraper == null) {
        sendCmdMessage(command.message, 'Error: scraper is not loaded', this.logger, LogLevel.TRACE);
        return;
      }

      // Also notify about parsing status
      status = await scraper.isEnabled();
      if (scraper.isExplicitlyDisabled()) {
        sendCmdMessage(command.message, `${ScraperType[type]} parser is explicitly disabled`, this.logger, LogLevel.INFO);
      } else if (status == true) {
        sendCmdMessage(command.message, `${ScraperType[type]} parser is enabled`, this.logger, LogLevel.INFO);
      } else {
        sendCmdMessage(command.message, `${ScraperType[type]} parser is disabled`, this.logger, LogLevel.INFO);
      }
      return;
    case 2:
      // Handle as "set parsing status"
      // Admin only
      if (! await isAdmin(command.message)) {
        sendCmdMessage(command.message, 'Error: not admin', this.logger, LogLevel.INFO);
        return;
      }

      // Lookup type from string
      type = typeFromLowercase(command.arguments[0].toLowerCase());
      if (type == null) {
        sendCmdMessage(command.message, 'Error: invalid type', this.logger, LogLevel.TRACE);
        return;
      }

      scraper = ScraperHelper.getScraperForType(type);
      if (scraper == null) {
        sendCmdMessage(command.message, 'Error: scraper is not loaded', this.logger, LogLevel.TRACE);
        return;
      }

      status = command.arguments[0] == 'true';
      
      if (status == true) {
        await scraper.enable();
      } else {
        await scraper.disable();
      }

      sendCmdMessage(command.message, `${ScraperType[type]} scraping status updated to ${status}`, this.logger, LogLevel.INFO);
      return;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    }
  }
}