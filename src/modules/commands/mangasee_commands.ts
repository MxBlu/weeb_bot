import { Manga } from "mangadex-full-api";
import { MANGASEE_DISABLED } from "../../constants/constants.js";
import { isAdmin, sendCmdMessage } from "../../framework/bot_utils.js";
import { Logger } from "../../framework/logger.js";
import { MangadexHelper, MangaLite } from "../../support/mangadex.js";
import { Store } from "../../support/store.js";
import { BotCommand } from "../bot.js";
import { MangaseeScraper } from "../mangasee_scraper.js";

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
        sendCmdMessage(command.message, 'Mangasee parser is explicitly disabled', 2, this.logger);
      } else if (status == true) {
        sendCmdMessage(command.message, 'Mangasee parser is enabled', 2, this.logger);
      } else {
        sendCmdMessage(command.message, 'Mangasee parser is disabled', 2, this.logger);
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
        await MangaseeScraper.enable();
      } else {
        await MangaseeScraper.disable();
      }

      sendCmdMessage(command.message, `Mangasee parsing status updated to ${status}`, 2, this.logger);
      return;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', 3, this.logger);
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
      sendCmdMessage(command.message, 'Error: incorrect argument count', 3, this.logger);
      return;
    }

    // Ensure we got a valid manga url
    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3, this.logger);
      return;
    }

    const altTitles = await Store.getAltTitles(manga.id);
    const str = `**${manga.title}**:\n` +
                Array.from(altTitles.values()).join('\n');
    sendCmdMessage(command.message, str, 3, this.logger);
  }

  public addaliasHandler = async (command: BotCommand): Promise<void> => {
    let manga: Manga | MangaLite = null;
    let altTitle: string = null;
    switch (command.arguments.length) {
    case 0:
    case 1:
      sendCmdMessage(command.message, 'Error: incorrect argument count', 3, this.logger);
      return;
    default:
      manga = await MangadexHelper.parseTitleUrlToMangaLite(command.arguments[0]);
      // Recombine all arguments after the first into one
      altTitle = command.arguments.slice(1).join(' ');

      break;
    }

    // Ensure we got a valid manga url
    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3, this.logger);
      return;
    }

    await Store.addAltTitle(manga.id, altTitle);
    sendCmdMessage(command.message, `Added alt title '${altTitle}' to '${manga.title}'`, 2, this.logger);
  }

  public delaliasHandler = async (command: BotCommand): Promise<void> => {
    let manga: Manga | MangaLite = null;
    let altTitle: string = null;
    switch (command.arguments.length) {
    case 0:
    case 1:
      sendCmdMessage(command.message, 'Error: incorrect argument count', 3, this.logger);
      return;
    default:
      manga = await MangadexHelper.parseTitleUrlToMangaLite(command.arguments[0]);
      // Recombine all arguments after the first into one
      altTitle = command.arguments.slice(1).join(' ');

      break;
    }

    // Ensure we got a valid manga url
    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', 3, this.logger);
      return;
    }

    await Store.delAltTitle(manga.id, altTitle);
    sendCmdMessage(command.message, `Removed alt title '${altTitle}' to '${manga.title}'`, 2, this.logger);
  }
}