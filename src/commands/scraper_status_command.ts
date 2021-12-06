import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, isAdmin, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { ScraperType, typeFromLowercase } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";

export class ScraperStatusCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("ScraperStatusCommand");
  }
  
  public provideSlashCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('scraperstatus')
        .setDescription('Get (or set) status of a scraper')
        .addStringOption(builder =>
          builder.setName('scraper')
            .setDescription('Manga scraper')
            .addChoices(
              ScraperHelper.getAllRegisteredScraperTypes().map(
                type => [ ScraperType[type], ScraperType[type] ]))
            .setRequired(true)
        ).addBooleanOption(builder =>
          builder.setName('state')
            .setDescription('State to set')
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/scraperstatus <scraper type> [<enable>] - Get (or set) status of a scraper";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const scraperName = interaction.options.getString('scraper');
    const state = interaction.options.getString('state');

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

      // Also notify about parsing status
      const currentState = await scraper.isEnabled();
      if (scraper.isExplicitlyDisabled()) {
        sendCmdReply(interaction, `${ScraperType[type]} parser is explicitly disabled`, this.logger, LogLevel.INFO);
      } else if (currentState == true) {
        sendCmdReply(interaction, `${ScraperType[type]} parser is enabled`, this.logger, LogLevel.INFO);
      } else {
        sendCmdReply(interaction, `${ScraperType[type]} parser is disabled`, this.logger, LogLevel.INFO);
      }
    } else {
      // state != null - Set state for scraper

      // Admin only
      if (! await isAdmin(interaction.guild, interaction.user)) {
        sendCmdReply(interaction, 'Error: not admin', this.logger, LogLevel.INFO);
        return;
      }

      const toState = state == 'true';
      
      if (toState == true) {
        await scraper.enable();
      } else {
        await scraper.disable();
      }

      sendCmdReply(interaction, `${ScraperType[type]} scraping status updated to ${toState}`, this.logger, LogLevel.INFO);
      return;
    }
  }
}