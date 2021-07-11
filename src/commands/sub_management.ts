import { sendCmdMessage, stringEquivalence, Logger, LogLevel, BotCommand, CommandInterface, BotCommandHandlerFunction } from "bot-framework";
import { Role, TextChannel } from "discord.js";

import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";
import { ScraperHelper } from "../support/scrapers.js";
import { ScraperType, typeFromLowercase } from "../constants/scraper_types.js";

export class SubManagementHandler implements CommandInterface {

  logger: Logger;

  constructor() {
    this.logger = new Logger("SubManagementHandler");
  }

  public commands() : Map<string, BotCommandHandlerFunction> {
    const commandMap = new Map<string, BotCommandHandlerFunction>();

    commandMap.set("sub", this.subscribeHandler);
    commandMap.set("unsub", this.unsubscribeHandler);
    commandMap.set("listsubs", this.listsubsHandler);

    return commandMap;
  }

  private subscribeHandler = async (command: BotCommand): Promise<void> => {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.debug(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }
    if (command.arguments.length < 2) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role and title URL', this.logger, LogLevel.TRACE);
      return;
    }
    const roleName = command.arguments[0];
    const url = command.arguments[1];
    
    const guild = command.message.guild;
    let role: Role = null;

    const roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', this.logger, LogLevel.TRACE);
      return;
    }

    const subscribable = await ScraperHelper.parseUri(url);
    if (subscribable == null) {
      sendCmdMessage(command.message, 'Error: Unknown URL', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.setTitleName(subscribable.type, subscribable.id, subscribable.title);
    await Store.addTitle(guild.id, role.id, subscribable.type, subscribable.id);
    sendCmdMessage(command.message, 
        `Added title '${subscribable.title}' from '${ScraperType[subscribable.type]}' to role @${role.name}`, this.logger, LogLevel.INFO);
  }

  private unsubscribeHandler = async (command: BotCommand): Promise<void> => {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.debug(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }
    if (command.arguments.length < 2) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role and title URL', this.logger, LogLevel.TRACE);
      return;
    }
    const roleName = command.arguments[0];
    const url = command.arguments[1];

    const guild = command.message.guild;
    let role: Role = null;

    const roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

    if (role == null) {
      sendCmdMessage(command.message, 'Error: role does not exist', this.logger, LogLevel.TRACE);
      return;
    }

    const subscribable = await ScraperHelper.parseUri(url);
    if (subscribable == null) {
      sendCmdMessage(command.message, 'Error: Unknown URL', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.delTitle(guild.id, role.id, subscribable.type, subscribable.id);
    sendCmdMessage(command.message, `Removed title '${subscribable.title}' from role @${role.name}`, this.logger, LogLevel.INFO);
  }

  private listsubsHandler = async (command: BotCommand): Promise<void> => {
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
    let role: Role = null;

    const roleRx = roleName.match(/^<@&(\d+)>$/);
    if (roleRx != null) {
      role = guild.roles.cache.get(roleRx[1]);
    } else {
      role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
    }

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
    if (titles == null || titles.size == 0) {
      sendCmdMessage(command.message, 'No subscriptions', this.logger, LogLevel.INFO);
      return;
    }
    
    const titleNames = new Map<string, string>();
    for (const title of titles) {
      titleNames.set(title, await Store.getTitleName(type, title));
    }

    const str = Array.from(titles.values()).map(t => `${titleNames.get(t)} - <${scraper.uriForId(t)}>`).join('\n');
    this.logger.info(`${role.name} - ${titles.size} subscriptions`);
    sendCmdMessage(command.message, str, this.logger, LogLevel.TRACE);
  }
}