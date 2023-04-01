import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction, MessageEmbed } from "discord.js";
import * as Mangadex from 'mangadex-full-api';

import { MangadexHelper } from "../support/mangadex.js";

export class DexInfoCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("DexInfoCommand");
  }
  
  public provideSlashCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('dexinfo')
        .setDescription('Provide a rich embed for a Mangadex link')
        .addStringOption(builder =>
          builder.setName('url')
            .setDescription('Mangadex URL')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/dexinfo <mangadex url> - Provide a rich embed for a Mangadex link";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
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
    const manga = await Mangadex.Manga.get(mangaLite.id, true);

    // Get supplementary metadata about the manga
    const authors: Mangadex.Author[] = await Promise.all(manga.authors.map(a => a.resolve()));
    const image: Mangadex.Cover = await manga.mainCover.resolve();

    // Generate a rich embed
    const embed = new MessageEmbed()
        .setTitle(manga.title)
        .setDescription(manga.description)
        .setURL(url)
        .setFields([{
          name: "Tags",
          value: manga.tags.map(t => t.name).join(", ")
        }])
        .setFooter(authors.map(a => a.name).join(", "))
        .setTimestamp(manga.updatedAt);

    if (image != null) {
      embed.setImage(image.imageSource);
    }

    this.logger.info(`${interaction.user.username} requested for Mangadex info on ${mangaLite.id}`);

    // Send the embed as a reply
    interaction.editReply({ embeds: [ embed ] });
  }
}