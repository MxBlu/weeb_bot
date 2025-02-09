import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandBuilder, CommandProvider, isAdmin, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction } from "discord.js";

import { ScraperType, ScraperTypeNames, typeFromLowercase } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";

export class ScraperStatusCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("ScraperStatusCommand");
  }
  
  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('scraperstatus')
        .setDescription('Get (or set) status of a scraper')
        .addStringOption(builder =>
          builder.setName('scraper')
            .setDescription('Manga scraper')
            .addChoices(
              ScraperTypeNames.map(
                type => ({ name: type, value: type })))
            .setRequired(true)
        ).addBooleanOption(builder =>
          builder.setName('state')
            .setDescription('State to set')
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "/scraperstatus <scraper type> [<enable>] - Get (or set) status of a scraper";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const scraperName = interaction.options.getString('scraper');
    const state = interaction.options.getBoolean('state');

    // Lookup type from string
    const type = typeFromLowercase(scraperName.toLowerCase());
    if (type == null) {
      sendCmdReply(interaction, 'Error: invalid type', this.logger, LogLevel.TRACE);
      return;
    }

    // Get Scraper implementation class
    const scraper = ScraperHelper.getScraperForType(type);
    if (scraper == null) {
      sendCmdReply(interaction, 'Error: scraper is not loaded', this.logger, LogLevel.TRACE);
      return;
    }

    if (state == null) {
      // state == null - Print current state of scraper

      // First, check if the scraper has been disabled
      // Then check 
      const isEnabled = await scraper.isEnabled();
      if (scraper.isExplicitlyDisabled()) {
        sendCmdReply(interaction, `${ScraperType[type]} parser is explicitly disabled`, this.logger, LogLevel.INFO);
      } else if (isEnabled == false) {
        sendCmdReply(interaction, `${ScraperType[type]} parser is disabled`, this.logger, LogLevel.INFO);
      } else if (scraper.getStatus() == false) {
        sendCmdReply(interaction, `${ScraperType[type]} parser is enabled, but down`, this.logger, LogLevel.INFO);
      } else {
        sendCmdReply(interaction, `${ScraperType[type]} parser is enabled and up`, this.logger, LogLevel.INFO);
      }
    } else {
      // state != null - Set state for scraper

      // Admin only
      if (! await isAdmin(interaction.guild, interaction.user)) {
        sendCmdReply(interaction, 'Error: not admin', this.logger, LogLevel.INFO);
        return;
      }
      
      if (state == true) {
        await scraper.enable();
      } else {
        await scraper.disable();
      }

      sendCmdReply(interaction, `${ScraperType[type]} scraping status updated to ${state}`, this.logger, LogLevel.INFO);
      return;
    }
  }
}