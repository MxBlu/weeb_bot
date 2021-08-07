import { BotCommand, CommandProvider, findGuildRole, Logger, LogLevel, sendCmdMessage } from "bot-framework";
import { TextChannel } from "discord.js";

import { ScraperType } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";
import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";

export class SubCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("SubCommand");
  }

  public provideAliases(): string[] {
    return [ "sub" ];
  }

  public provideHelpMessage(): string {
    return "!sub <role> <manga url> - Subscribe given role to given manga";
  }

  public async handle(command: BotCommand): Promise<void> {
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

    const role = await findGuildRole(roleName, guild);
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
}