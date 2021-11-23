import { SlashCommandBuilder, SlashCommandRoleOption, SlashCommandStringOption } from "@discordjs/builders";
import { CommandProvider, findGuildRole, Logger, LogLevel, ModernApplicationCommandJSONBody, Reactable } from "bot-framework";
import { CommandInteraction, GuildMember, MessageEmbed, MessageReaction, Role, TextChannel } from "discord.js";

import { ENTRIES_PER_LIST_QUERY } from "../constants/constants.js";
import { ScraperType, typeFromLowercase } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";
import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";

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
  
  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('listsubs')
        .setDescription('List all subscriptions for given role and scraper')
        .addRoleOption(
          new SlashCommandRoleOption()
            .setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).addStringOption(
          new SlashCommandStringOption()
            .setName('scraper')
            .setDescription('Manga scraper')
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/listsubs <role> <scraper type> - List all subscriptions for given role and scraper";
  }

  public async handle(command: BotCommand): Promise<void> {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.info(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }

    const guild = command.message.guild;
    let subscriptions: SubscriptionItem[] = [];
    let embedTitle: string = null;

    let roleName: string = null;
    let role: Role = null;
    switch (command.arguments.length) {
    case 1:
      // Get all subscriptions for a given role and for all given scraper types
      roleName = command.arguments[0];

      role = await findGuildRole(roleName, guild);
      if (role == null) {
        sendCmdMessage(command.message, 'Error: role does not exist', this.logger, LogLevel.TRACE);
        return;
      }

      // For every type, get all subscriptions and add it to the subscriptions array
      for (const type of ScraperHelper.getAllRegisteredScraperTypes()) {
        const scraper = ScraperHelper.getScraperForType(type);
        const titleIds = await Store.getTitles(guild.id, role.id, type);
        subscriptions = subscriptions.concat(await Promise.all(Array.from(titleIds)
            .map(async id => ({ 
              title: `${await Store.getTitleName(type, id)} - ${ScraperType[type]}`, 
              link: scraper.uriForId(id)
            }))))
      }

      if (subscriptions.length == 0) {
        sendCmdMessage(command.message, 'No subscriptions', this.logger, LogLevel.INFO);
        return;
      }

      embedTitle = `Subscriptions - @${role.name}`;
      break;
    case 2:
      // Get all subscriptions for a given role and scraper type
      roleName = command.arguments[0];
      const typeName = command.arguments[1];

      role = await findGuildRole(roleName, guild);
      if (role == null) {
        sendCmdMessage(command.message, 'Error: role does not exist', this.logger, LogLevel.TRACE);
        return;
      }

      // Lookup type from string
      const type = typeFromLowercase(typeName.toLowerCase());
      if (type == null) {
        sendCmdMessage(command.message, 'Error: invalid type', this.logger, LogLevel.TRACE);
        return;
      }

      const scraper = ScraperHelper.getScraperForType(type);
      if (scraper == null) {
        sendCmdMessage(command.message, 'Error: scraper is not loaded', this.logger, LogLevel.TRACE);
        return;
      }

      const titleIds = await Store.getTitles(guild.id, role.id, type);
      if (titleIds.size == 0) {
        sendCmdMessage(command.message, 'No subscriptions', this.logger, LogLevel.INFO);
        return;
      }

      // Generate all subscription items to list
      subscriptions = await Promise.all(Array.from(titleIds)
          .map(async id => ({ 
            title: await Store.getTitleName(type, id), 
            link: scraper.uriForId(id) 
          })));

      embedTitle = `Subscriptions - @${role.name} - ${ScraperType[type]}`;
      break;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
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

    // Send initial embed
    this.logger.info(`${embedTitle} - ${subscriptions.length} subscriptions`);
    const message = await command.message.channel.send(embed);

    // Create scrollable modal
    const reactable = new Reactable<ListSubsProps>(message);
    reactable.registerHandler("⬅️", this.listSubsLeftHandler);
    reactable.registerHandler("➡️", this.listSubsRightHandler);
    reactable.props = new ListSubsProps();
    reactable.props.embedTitle = embedTitle;
    reactable.props.subscriptions = subscriptions;

    // Activate and track the modal
    reactable.activate(true);
  }

  private listSubsLeftHandler = async (reactable: Reactable<ListSubsProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    const props: ListSubsProps = reactable.props;
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
    
    // Modify original message with new quotes
    this.logger.debug(`${user.user.username} navigated sub list - ${props.embedTitle} skip ${props.skip}`);
    reactable.message.edit(new MessageEmbed()
        .setTitle(props.embedTitle)
        .setDescription(subscriptionsStr)
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }

  private listSubsRightHandler = async (reactable: Reactable<ListSubsProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    const props: ListSubsProps = reactable.props;
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
    
    // Modify original message with new quotes
    this.logger.debug(`${user.user.username} navigated sub list - ${props.embedTitle} skip ${props.skip}`);
    reactable.message.edit(new MessageEmbed()
        .setTitle(props.embedTitle)
        .setDescription(subscriptionsStr)
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }
}