import { CommandBuilder, CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { MangadexHelper } from "../support/mangadex.js";
import { Store } from "../support/store.js";

export class DelAliasCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("DelAliasCommand");
  }

  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('delalias')
        .setDescription('Delete an alias from a given manga')
        .addStringOption(builder =>
          builder.setName('url')
            .setDescription('Manga URL')
            .setRequired(true)
        ).addStringOption(builder =>
          builder.setName('alias')
            .setDescription('Name alias to remove')
            .setRequired(true)
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "/delalias <manga url> <alias> - Delete an alias from a given manga";
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

    await Store.delAltTitle(manga.id, alias);
    sendCmdReply(interaction, `Removed alt title '${alias}' to '${manga.title}'`, this.logger, LogLevel.INFO);
  }
}