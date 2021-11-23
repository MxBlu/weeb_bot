import { SlashCommandBuilder, SlashCommandRoleOption, SlashCommandStringOption } from "@discordjs/builders";
import { CommandProvider, findGuildRole, Logger, LogLevel, ModernApplicationCommandJSONBody } from "bot-framework";
import { CommandInteraction, TextChannel } from "discord.js";

import { ScraperType } from "../constants/scraper_types.js";
import { ScraperHelper } from "../support/scrapers.js";
import { Store } from "../support/store.js";
import { checkIfSubscribed } from "../support/weeb_utils.js";

export class SubCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("SubCommand");
  }
    
  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('sub')
        .setDescription('Subscribe given manga to given role')
        .addRoleOption(
          new SlashCommandRoleOption()
            .setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).addStringOption(
          new SlashCommandStringOption()
            .setName('url')
            .setDescription('Manga URL')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/sub <role> <manga url> - Subscribe given manga to given role";
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