import { BotCommand, CommandProvider, Logger, LogLevel, sendCmdMessage } from "bot-framework";
import { Manga } from "mangadex-full-api";

import { MangadexHelper, MangadexManga } from "../support/mangadex.js";
import { Store } from "../support/store.js";

export class GetAliasesCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GetAliasesCommand");
  }

  public provideAliases(): string[] {
    return [ "getaliases" ];
  }

  public provideHelpMessage(): string {
    return "!getaliases <manga url> - Get all aliases for given manga - Used by Mangasee fallback parser";
  }

  public async handle(command: BotCommand): Promise<void> {
    let manga: Manga | MangadexManga = null;
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
}