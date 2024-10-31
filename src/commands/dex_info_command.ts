import { CommandBuilder, CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import * as Mangadex from 'mangadex-full-api';

import { MangadexHelper } from "../support/mangadex.js";

export class DexInfoCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("DexInfoCommand");
  }
  
  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('dexinfo')
        .setDescription('Provide a rich embed for a Mangadex link')
        .addStringOption(builder =>
          builder.setName('url')
            .setDescription('Mangadex URL')
            .setRequired(true)
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "/dexinfo <mangadex url> - Provide a rich embed for a Mangadex link";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const url = interaction.options.getString('url');
    
    // Ensure we got a valid manga url by using `parseTitleUrlToMangaLite()`
    const mangaLite = await MangadexHelper.parseTitleUrlToMangaLite(url);
    if (mangaLite == null) {
      sendCmdReply(interaction, 'Error: bad title URL', this.logger, LogLevel.TRACE);
      return;
    }

    // Next few steps gonna take a while so let's defer the reply
    await interaction.deferReply();
    // Get the actual Manga object from Mangadex, since that's what we wanna display
    let manga: Mangadex.Manga;
    try {
      manga = await Mangadex.Manga.get(mangaLite.id);
    } catch (e) {
      const error = e as Error;

      let handled = false;
      if (error.name == 'APIResponseError') {
        if (error.message.includes('not_found_http_exception')) {
          // Manga not found, more on
          sendCmdReply(interaction, "Manga not found", this.logger, LogLevel.TRACE);
          return;
        }
      }
      // If we didn't handle the error, rethrow it
      if (!handled) {
        sendCmdReply(interaction, "An error occured", this.logger, LogLevel.TRACE);
        throw e;
      }
    }

    // Get supplementary metadata about the manga
    const authors: Mangadex.Author[] = await Promise.all(manga.authors.map(a => a.resolve()));
    const image: Mangadex.Cover = await manga.mainCover.resolve();

    // Generate a rich embed
    const embed = new EmbedBuilder()
        .setTitle(manga.title.localString)
        .setDescription(manga.description.localString)
        .setURL(url)
        .setFields([{
          name: "Tags",
          value: manga.tags.map(t => t.name.localString).join(", ")
        }])
        .setFooter({ text: authors.map(a => a.name).join(", ") })
        .setTimestamp(manga.updatedAt);

    if (image != null) {
      embed.setImage(image.url);
    }

    this.logger.info(`${interaction.user.username} requested for Mangadex info on ${mangaLite.id}`);

    // Send the embed as a reply
    interaction.editReply({ embeds: [ embed ] });
  }
}