import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, ModernApplicationCommandJSONBody } from "bot-framework";
import { CommandInteraction } from "discord.js";

import { MangadexPulseTopic } from "../constants/topics.js";

export class DexStatusCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("DexStatusCommand");
  }

  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('dexstatus')
        .setDescription('Get last known status of Mangadex')
        .toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/dexstatus - Get last known status of Mangadex";
  }

  public async handle(command: BotCommand): Promise<void> {
    switch (command.arguments.length) {
    case 0:
      // Get the last known status about Mangadex
      const dexStatus = MangadexPulseTopic.getLastData();
      if (dexStatus?.status === true) {
        let message = `Mangadex up`;
        if (dexStatus.lastDown != null) {
          message += ` since ${dexStatus.lastDown.toUTCString()}`;
        }
        sendCmdMessage(command.message, message, this.logger, LogLevel.INFO);
      } else if (dexStatus?.status === false) {
        let message = `Mangadex unreachable`;
        if (dexStatus.lastUp != null) {
          message += ` since ${dexStatus.lastUp.toUTCString()}`;
        }
        sendCmdMessage(command.message, message, this.logger, LogLevel.INFO);
      } else {
        sendCmdMessage(command.message, 'Mangadex status unknown', this.logger, LogLevel.INFO);
      }

      return;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.DEBUG);
      return;
    }
  }
}