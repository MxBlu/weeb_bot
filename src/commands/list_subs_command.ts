import { BotCommand, CommandProvider, findGuildRole, Logger, LogLevel, Reactable, sendCmdMessage } from "bot-framework";
import { GuildMember, MessageEmbed, MessageReaction, TextChannel } from "discord.js";

import { ENTRIES_PER_LIST_QUERY } from "../constants/constants.js";
import { ScraperType, typeFromLowercase } from "../constants/scraper_types.js";
import { IScraper } from "../support/base_scraper.js";
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

export class ListSubsCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("ListSubsCommand");
  }

  public provideAliases(): string[] {
    return [ "listsubs" ];
  }

  public provideHelpMessage(): string {
    return "!listsubs <role> <scraper type> - List all subscriptions for given role and scraper";
  }

  public async handle(command: BotCommand): Promise<void> {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.info(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }

    const guild = command.message.guild;
    let subscriptions: SubscriptionItem[] = null;
    let embedTitle: string = null;

    switch (command.arguments.length) {
    case 1:
      // TODO: Implement as "all scraper types"
      sendCmdMessage(command.message, 'Error: missing scraper type', this.logger, LogLevel.TRACE);
      return;
    case 2:
      const roleName = command.arguments[0];
      const typeName = command.arguments[1];

      const role = await findGuildRole(roleName, guild);
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