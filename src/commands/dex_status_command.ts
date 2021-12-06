import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { MangadexPulseTopic } from "../constants/topics.js";

export class DexStatusCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("DexStatusCommand");
  }

  public provideSlashCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
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

  public async handle(interaction: CommandInteraction): Promise<void> {
    // Get the last known status about Mangadex
    const dexStatus = MangadexPulseTopic.getLastData();
    if (dexStatus?.status === true) {
      let message = `Mangadex up`;
      if (dexStatus.lastDown != null) {
        message += ` since ${dexStatus.lastDown.toUTCString()}`;
      }
      sendCmdReply(interaction, message, this.logger, LogLevel.INFO);
    } else if (dexStatus?.status === false) {
      let message = `Mangadex unreachable`;
      if (dexStatus.lastUp != null) {
        message += ` since ${dexStatus.lastUp.toUTCString()}`;
      }
      sendCmdReply(interaction, message, this.logger, LogLevel.INFO);
    } else {
      sendCmdReply(interaction, 'Mangadex status unknown', this.logger, LogLevel.INFO);
    }
  }
}