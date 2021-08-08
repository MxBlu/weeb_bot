import { BotCommand, CommandProvider, Logger, LogLevel, sendCmdMessage } from "bot-framework";
import { Manga } from "mangadex-full-api";

import { MangadexHelper, MangadexManga } from "../support/mangadex.js";
import { Store } from "../support/store.js";

export class AddAliasCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("AddAliasCommand");
  }

  public provideAliases(): string[] {
    return [ "addalias" ];
  }

  public provideHelpMessage(): string {
    return "!addalias <manga url> <alias> -Add an alias to a given manga";
  }

  public async handle(command: BotCommand): Promise<void> {
    let manga: Manga | MangadexManga = null;
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
}