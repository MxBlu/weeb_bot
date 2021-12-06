import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, Interactable, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { ButtonInteraction, CommandInteraction, Message, MessageEmbed } from "discord.js";

import { ENTRIES_PER_LIST_QUERY } from "../constants/constants.js";
import { ScraperType, typeFromLowercase } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";
import { Cache } from "../support/store.js";

class SubscriptionItem {
  title: string;
  link: string;
}

class ListSubsProps {
  embedTitle: string;
  // All subscription items for listing
  subscriptions: SubscriptionItem[];
  // Current index
  skip = 0;
}

export class ListSubsCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("ListSubsCommand");
  }  
  
  public provideSlashCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('listsubs')
        .setDescription('List all subscriptions for given role and scraper')
        .addRoleOption(builder =>
          builder.setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).addStringOption(builder =>
          builder.setName('scraper')
            .setDescription('Manga scraper')
            .addChoices(
              ScraperHelper.getAllRegisteredScraperTypes().map(
                type => [ ScraperType[type], ScraperType[type] ]))
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/listsubs <role> <scraper type> - List all subscriptions for given role and scraper";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');
    const scraperName = interaction.options.getString('scraper');
    
    let subscriptions: SubscriptionItem[] = [];
    let embedTitle: string = null;

    if (scraperName != null) {
      // Get all subscriptions for a given role and scraper type
      // Lookup type from string
      const type = typeFromLowercase(scraperName.toLowerCase());
      if (type == null) {
        sendCmdReply(interaction, 'Error: invalid type', this.logger, LogLevel.TRACE);
        return;
      }

      const scraper = ScraperHelper.getScraperForType(type);
      if (scraper == null) {
        sendCmdReply(interaction, 'Error: scraper is not loaded', this.logger, LogLevel.TRACE);
        return;
      }

      // Get titles for given role and type
      const titleCacheRecords = await Cache.getTitleRecordsTyped(guild.id, role.id, type);

      // Generate all subscription items to list
      subscriptions = titleCacheRecords.map(record => ({ 
            title: record.title,
            link: record.url
          }));
        
      embedTitle = `Subscriptions - @${role.name} - ${ScraperType[type]}`;
    } else {
      // Get titles for given role
      const titleCacheRecords = await Cache.getTitleRecordsAll(guild.id, role.id);

      // Generate all subscription items to list
      subscriptions = titleCacheRecords.map(record => ({ 
            title: record.title,
            link: record.url
          }));

      embedTitle = `Subscriptions - @${role.name}`;
    }
    
    if (subscriptions.length == 0) {
      sendCmdReply(interaction, 'No subscriptions', this.logger, LogLevel.INFO);
      return;
    }

    // Sort list by title
    subscriptions.sort((a, b) => a.title.localeCompare(b.title));
    
    // Create string with first ENTRIES_PER_LIST_QUERY number of subscription items
    const subscriptionsStr = subscriptions
        .slice(0, ENTRIES_PER_LIST_QUERY)
        .map(sub => `[${sub.title}](${sub.link})`)
        .join('\n');

    const embed = new MessageEmbed()
        .setTitle(embedTitle)
        .setDescription(subscriptionsStr);

    // Create scrollable modal
    const interactable = new Interactable<ListSubsProps>();
    interactable.registerHandler(this.listSubsLeftHandler, { emoji: "⬅️" });
    interactable.registerHandler(this.listSubsRightHandler, { emoji: "➡️" });
    interactable.props = new ListSubsProps();
    interactable.props.embedTitle = embedTitle;
    interactable.props.subscriptions = subscriptions;
    
    // Get generated action row
    const actionRow = interactable.getActionRow();

    // Send initial embed
    this.logger.info(`${embedTitle} - ${subscriptions.length} subscriptions`);
    const message = await interaction.reply({ 
      embeds: [ embed ], 
      components: [ actionRow ], 
      fetchReply: true 
    });

    // Activate interaction handling
    interactable.activate(message as Message);
  }

  private listSubsLeftHandler = async (interactable: Interactable<ListSubsProps>, 
      interaction: ButtonInteraction): Promise<void> => {
    const props: ListSubsProps = interactable.props;
    if (props.skip == 0) {
      // Already left-most, loop around
      // Go to the next lowest value of 10 (ensuring we don't end up on the same value)
      props.skip = props.subscriptions.length - (props.subscriptions.length % 10);
    } else {
      // Go back 10 results
      props.skip -= 10;
    }

    // Generate new subscriptions string
    const subscriptionsStr = props.subscriptions
    .slice(props.skip, props.skip + ENTRIES_PER_LIST_QUERY)
        .map(sub => `[${sub.title}](${sub.link})`)
        .join('\n');

    // Generate new embed
    const newEmbed = new MessageEmbed()
        .setTitle(props.embedTitle)
        .setDescription(subscriptionsStr)
        .setFooter(props.skip > 0 ? `+${props.skip}` : '');
    
    // Update message with new embed
    this.logger.debug(`${interaction.user.username} navigated sub list - ${props.embedTitle} skip ${props.skip}`);
    interaction.update({ embeds: [ newEmbed ] });
  }

  private listSubsRightHandler = async (interactable: Interactable<ListSubsProps>, 
      interaction: ButtonInteraction): Promise<void> => {
    const props: ListSubsProps = interactable.props;
    // Go forward 10 results
    props.skip += 10;
    // If we exceed the amount of subs we have, loop back around
    if (props.skip > props.subscriptions.length) {
      props.skip = 0;
    }
    
    // Generate new subscriptions string
    const subscriptionsStr = props.subscriptions
    .slice(props.skip, props.skip + ENTRIES_PER_LIST_QUERY)
        .map(sub => `[${sub.title}](${sub.link})`)
        .join('\n');
    
    // Generate new embed
    const newEmbed = new MessageEmbed()
        .setTitle(props.embedTitle)
        .setDescription(subscriptionsStr)
        .setFooter(props.skip > 0 ? `+${props.skip}` : '');
    
    // Update message with new embed
    this.logger.debug(`${interaction.user.username} navigated sub list - ${props.embedTitle} skip ${props.skip}`);
    interaction.update({ embeds: [ newEmbed ] });
  }
}