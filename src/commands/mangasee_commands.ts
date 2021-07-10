import { Manga } from "mangadex-full-api";
import { MANGASEE_DISABLED } from "../constants/constants.js";
import { isAdmin, sendCmdMessage } from "../framework/bot_utils.js";
import { Logger } from "../framework/logger.js";
import { MangadexHelper, MangaLite } from "../support/mangadex.js";
import { Store } from "../support/store.js";
import { BotCommand } from "../modules/bot.js";
import { MangaseeScraper } from "../modules/mangasee_scraper.js";
import { LogLevel } from "../framework/constants/log_levels.js";

export class MangaseeCommandHandler {

  logger: Logger;

  constructor() {
    this.logger = new Logger("MangaseeCommandHandler");
  }

  public mangaseestatusHandler = async (command: BotCommand): Promise<void> => {
    let status = false;
    switch (command.arguments.length) {
    case 0:
      // Handle as "get current parsing status"
      status = await Store.isMangaseeEnabled();
      if (MANGASEE_DISABLED == true) {
        sendCmdMessage(command.message, 'Mangasee parser is explicitly disabled', this.logger, LogLevel.INFO);
      } else if (status == true) {
        sendCmdMessage(command.message, 'Mangasee parser is enabled', this.logger, LogLevel.INFO);
      } else {
        sendCmdMessage(command.message, 'Mangasee parser is disabled', this.logger, LogLevel.INFO);
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
        await MangaseeScraper.enable();
      } else {
        await MangaseeScraper.disable();
      }

      sendCmdMessage(command.message, `Mangasee parsing status updated to ${status}`, this.logger, LogLevel.INFO);
      return;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    }
  }

  public getaliasesHandler = async (command: BotCommand): Promise<void> => {
    let manga: Manga | MangaLite = null;
    switch (command.arguments.length) {
    case 1:
      manga = await MangadexHelper.parseTitleUrlToMangaLite(command.arguments[0]);

      break;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    }

    // Ensure we got a valid manga url
    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', this.logger, LogLevel.DEBUG);
      return;
    }

    const altTitles = await Store.getAltTitles(manga.id);
    const str = `**${manga.title}**:\n` +
                Array.from(altTitles.values()).join('\n');
    this.logger.info(`Manga ${manga.title} has ${altTitles.size} alt titles`);
    sendCmdMessage(command.message, str, this.logger, LogLevel.TRACE);
  }

  public addaliasHandler = async (command: BotCommand): Promise<void> => {
    let manga: Manga | MangaLite = null;
    let altTitle: string = null;
    switch (command.arguments.length) {
    case 0:
    case 1:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    default:
      manga = await MangadexHelper.parseTitleUrlToMangaLite(command.arguments[0]);
      // Recombine all arguments after the first into one
      altTitle = command.arguments.slice(1).join(' ');

      break;
    }

    // Ensure we got a valid manga url
    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.addAltTitle(manga.id, altTitle);
    sendCmdMessage(command.message, `Added alt title '${altTitle}' to '${manga.title}'`, this.logger, LogLevel.INFO);
  }

  public delaliasHandler = async (command: BotCommand): Promise<void> => {
    let manga: Manga | MangaLite = null;
    let altTitle: string = null;
    switch (command.arguments.length) {
    case 0:
    case 1:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    default:
      manga = await MangadexHelper.parseTitleUrlToMangaLite(command.arguments[0]);
      // Recombine all arguments after the first into one
      altTitle = command.arguments.slice(1).join(' ');

      break;
    }

    // Ensure we got a valid manga url
    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.delAltTitle(manga.id, altTitle);
    sendCmdMessage(command.message, `Removed alt title '${altTitle}' to '${manga.title}'`, this.logger, LogLevel.INFO);
  }
}