import { CommandBuilder, CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";

import { MangadexHelper } from "../support/mangadex.js";
import { Store } from "../support/store.js";

export class AddAliasCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("AddAliasCommand");
  }

  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('addalias')
        .setDescription('Add an alias to a given manga')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('url')
            .setDescription('Manga URL')
            .setRequired(true)
        ).addStringOption(
          new SlashCommandStringOption()
            .setName('alias')
            .setDescription('Name alias to set')
            .setRequired(true)
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "/addalias <manga url> <alias> - Add an alias to a given manga";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const url = interaction.options.getString('url');
    const alias = interaction.options.getString('alias');
    
    // Ensure we got a valid manga url
    const manga = await MangadexHelper.parseTitleUrlToMangaLite(url);
    if (manga == null) {
      sendCmdReply(interaction, 'Error: bad title URL', this.logger, LogLevel.TRACE);
      return;
    }

    await Store.addAltTitle(manga.id, alias);
    sendCmdReply(interaction, `Added alt title '${alias}' to '${manga.title}'`, this.logger, LogLevel.INFO);
  }
}