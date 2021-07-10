import { sendCmdMessage, stringEquivalence, Logger, LogLevel } from "bot-framework";
import { Role, TextChannel } from "discord.js";

import { MangadexHelper } from "../support/mangadex.js";
import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";
import { BotCommand } from "../modules/bot.js";

export class SubManagementHandler {

  logger: Logger;

  constructor() {
    this.logger = new Logger("SubManagementHandler");
  }

  public subscribeHandler = async (command: BotCommand): Promise<void> => {
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

    const manga = await MangadexHelper.parseTitleUrlToMangaLite(url);

    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', this.logger, LogLevel.TRACE);
      return;
    }

    await Store.setTitleName(manga.id, manga.title);
    await Store.addTitle(guild.id, role.id, manga.id);
    sendCmdMessage(command.message, `Added title '${manga.title}' to role @${role.name}`, this.logger, LogLevel.INFO);
  }

  public unsubscribeHandler = async (command: BotCommand): Promise<void> => {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.debug(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }
    if (command.arguments.length == 0) {
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

    const manga = await MangadexHelper.parseTitleUrlToMangaLite(url);

    if (manga == null) {
      sendCmdMessage(command.message, 'Error: bad title URL', this.logger, LogLevel.TRACE);
      return;
    }

    await Store.delTitle(guild.id, role.id, manga.id);
    sendCmdMessage(command.message, `Removed title '${manga.title}' from role @${role.name}`, this.logger, LogLevel.INFO);
  }

  public listsubsHandler = async (command: BotCommand): Promise<void> => {
    if (! await checkIfSubscribed(command.message)) {
      // Only handle if listening to this channel already
      this.logger.info(`Not listening to channel #${(command.message.channel as TextChannel).name}`);
      return;
    }
    if (command.arguments.length == 0) {
      sendCmdMessage(command.message, 'Error: missing an arugment, provide role', this.logger, LogLevel.TRACE);
      return;
    }
    const roleName = command.arguments[0];

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

    const titles = await Store.getTitles(guild.id, role.id);
    if (titles == null || titles.size == 0) {
      sendCmdMessage(command.message, 'No subscriptions', this.logger, LogLevel.INFO);
      return;
    }
    
    const titleNames = new Map<string, string>();
    for (const title of titles) {
      titleNames.set(title, await Store.getTitleName(title));
    }

    const str = Array.from(titles.values()).map(t => `${titleNames.get(t)} - <${MangadexHelper.toTitleUrl(t)}>`).join('\n');
    this.logger.info(`${role.name} - ${titles.size} subscriptions`);
    sendCmdMessage(command.message, str, this.logger, LogLevel.TRACE);
  }
}