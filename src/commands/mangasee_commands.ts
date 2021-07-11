import { BotCommand, Logger, LogLevel, sendCmdMessage } from "bot-framework";
import { Manga } from "mangadex-full-api";

import { MangadexHelper, MangaLite } from "../support/mangadex.js";
import { Store } from "../support/store.js";

import { BotCommandHandlerFunction, CommandInterface } from "./command_interface.js";

export class MangaseeCommandHandler implements CommandInterface {

  logger: Logger;

  constructor() {
    this.logger = new Logger("MangaseeCommandHandler");
  }

  public commands() : Map<string, BotCommandHandlerFunction> {
    const commandMap = new Map<string, BotCommandHandlerFunction>();

    commandMap.set("getaliases", this.getaliasesHandler);
    commandMap.set("addalias", this.addaliasHandler);
    commandMap.set("delalias", this.delaliasHandler);

    return commandMap;
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