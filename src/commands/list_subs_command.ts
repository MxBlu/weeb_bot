import { BotCommand, CommandProvider, findGuildRole, Logger, LogLevel, Reactable, sendCmdMessage } from "bot-framework";
import { GuildMember, MessageEmbed, MessageReaction, TextChannel } from "discord.js";

import { ENTRIES_PER_LIST_QUERY } from "../constants/constants.js";
import { ScraperType, typeFromLowercase } from "../constants/scraper_types.js";
import { IScraper } from "../support/base_scraper.js";
import { ScraperHelper } from "../support/scrapers.js";
import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";

class ListSubsProps {
  // List query
  titlesMap: Map<string, string>;
  // List query title
  embedTitle: string;
  // Scraper for querying
  scraper: IScraper;
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
    if (command.arguments.length < 2) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role and scraper type', this.logger, LogLevel.TRACE);
      return;
    }
    const roleName = command.arguments[0];
    const typeName = command.arguments[1];

    const guild = command.message.guild;

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

    const titles = await Store.getTitles(guild.id, role.id, type);
    if (titles.size == 0) {
      sendCmdMessage(command.message, 'No subscriptions', this.logger, LogLevel.INFO);
      return;
    }
    
    let titleMap = new Map<string, string>();
    for (const title of titles) {
      titleMap.set(title, await Store.getTitleName(type, title));
    }
    // Sort title map by value (title name)
    titleMap = new Map([...titleMap].sort((a, b) => a[1].localeCompare(b[1])));

    let embedTitle = `Subscriptions - @${role.name}`;
    if (type != null) {
      embedTitle += ` - ${ScraperType[type]}`;
    }
    
    const subscriptionsStr = Array.from(titleMap.entries())
        .slice(0, ENTRIES_PER_LIST_QUERY)
        .map(([id, name]) => `[${name}](${scraper.uriForId(id)})`)
        .join('\n');

    const embed = new MessageEmbed()
        .setTitle(embedTitle)
        .setDescription(subscriptionsStr);

    // Send initial embed
    this.logger.info(`${embedTitle} - ${titles.size} subscriptions`);
    const message = await command.message.channel.send(embed);

    // Create scrollable modal
    const reactable = new Reactable<ListSubsProps>(message);
    reactable.registerHandler("⬅️", this.listSubsLeftHandler);
    reactable.registerHandler("➡️", this.listSubsRightHandler);
    reactable.props = new ListSubsProps();
    reactable.props.embedTitle = embedTitle;
    reactable.props.titlesMap = titleMap;
    reactable.props.scraper = scraper;

    // Activate and track the modal
    reactable.activate(true);
  }

  private listSubsLeftHandler = async (reactable: Reactable<ListSubsProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    const props: ListSubsProps = reactable.props;
    if (props.skip == 0) {
      // Already left-most, loop around
      // Go to the next lowest value of 10 (ensuring we don't end up on the same value)
      props.skip = props.titlesMap.size - (props.titlesMap.size % 10);
    } else {
      // Go back 10 results
      props.skip -= 10;
    }

    // Generate new subscriptions string
    const subscriptionsStr = Array.from(props.titlesMap.entries())
        .slice(props.skip, props.skip + ENTRIES_PER_LIST_QUERY)
        .map(([id, name]) => `[${name}](${props.scraper.uriForId(id)})`)
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
    if (props.skip > props.titlesMap.size) {
      props.skip = 0;
    }
    
    // Generate new subscriptions string
    const subscriptionsStr = Array.from(props.titlesMap.entries())
        .slice(props.skip, props.skip + ENTRIES_PER_LIST_QUERY)
        .map(([id, name]) => `[${name}](${props.scraper.uriForId(id)})`)
        .join('\n');
    
    // Modify original message with new quotes
    this.logger.debug(`${user.user.username} navigated sub list - ${props.embedTitle} skip ${props.skip}`);
    reactable.message.edit(new MessageEmbed()
        .setTitle(props.embedTitle)
        .setDescription(subscriptionsStr)
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }
}