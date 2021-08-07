import { BotCommand, CommandProvider, findGuildRole, Logger, LogLevel, sendCmdMessage } from "bot-framework";
import { TextChannel } from "discord.js";

import { typeFromLowercase } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";
import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";

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