import { sendMessage, Logger } from "bot-framework";
import { Client as DiscordClient, TextChannel } from "discord.js";
import { NEW_CHAPTER_EVENT_DISABLED } from "../constants/constants.js";

import { MangaAlert } from "../models/MangaAlert.js";
import { Store } from "../support/store.js";

export class NewChapterEventHandler {

  discord: DiscordClient;

  logger: Logger;

  constructor(discord: DiscordClient) {
    this.discord = discord;
    this.logger = new Logger("NewChapterEventHandler");
  }


  public newChapterHandler = async (alert: MangaAlert): Promise<void> => {
    // If debug flag is set to disable this handler, just return
    if (NEW_CHAPTER_EVENT_DISABLED) {
      return;
    }

    const guild = this.discord.guilds.cache.get(alert.guildId);
    if (guild == null) {
      this.logger.warn(`Notifying for a guild no longer available: ${alert.guildId} => ${alert.mangaChapter.titleId}`);
      return;
    }

    // Create a map of channels to roles to notify in said channels
    const rolesToNotifyPerChannel = new Map<string, string[]>();
    for (const roleId of alert.rolesIds) {
      const notifChannel = await Store.getNotifChannel(guild.id, roleId);
      if (notifChannel == null) {
        continue;
      }

      const rolesToNotify = rolesToNotifyPerChannel.get(notifChannel);
      if (rolesToNotify != null) {
        rolesToNotify.push(roleId);
      } else {
        rolesToNotifyPerChannel.set(notifChannel, [ roleId ]);
      }
    }


    for (const [channelId, roles] of rolesToNotifyPerChannel.entries()) {
      const channel = guild.channels.cache.get(channelId) as TextChannel;
      const pingStr = roles.map(role => `<@&${role}>`).join(' ');
      const pagesStr = alert.mangaChapter.pageCount != null ? `${alert.mangaChapter.pageCount} pages - ` : '';

      const msg = 
        `${alert.mangaTitle} - Chapter ${alert.mangaChapter.chapter} - ${pagesStr}${pingStr}\n` +
        `${alert.mangaChapter.link}`
      
      try {
        this.logger.debug(`Notifying '${alert.mangaTitle} ${alert.mangaChapter.chapter}' to ${guild.id}@${channelId}`);
        sendMessage(channel, msg); 
      } catch (e) {
        this.logger.error(`Failed to send notification to ${guild.id}@${channelId}: ${e}`);
      }
    }
  }

}