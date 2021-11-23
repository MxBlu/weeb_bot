import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, ModernApplicationCommandJSONBody } from "bot-framework";
import { CommandInteraction } from "discord.js";
import { Manga } from "mangadex-full-api";

import { MangadexHelper, MangadexManga } from "../support/mangadex.js";
import { Store } from "../support/store.js";

export class DelAliasCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("DelAliasCommand");
  }

  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('delalias')
        .setDescription('Delete an alias from a given manga')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('url')
            .setDescription('Manga URL')
            .setRequired(true)
        ).addStringOption(
          new SlashCommandStringOption()
            .setName('alias')
            .setDescription('Name alias to remove')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/delalias <manga url> <alias> - Delete an alias from a given manga";
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

    await Store.delAltTitle(manga.id, altTitle);
    sendCmdMessage(command.message, `Removed alt title '${altTitle}' to '${manga.title}'`, this.logger, LogLevel.INFO);
  }
}