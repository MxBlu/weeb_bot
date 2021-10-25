import { sendMessage, Logger } from "bot-framework";
import { Client as DiscordClient, Guild, TextChannel } from "discord.js";

import { NEW_CHAPTER_EVENT_DISABLED, NEW_CHAPTER_EVENT_FLUSH_INVERVAL } from "../constants/constants.js";
import { MangaAlert } from "../models/MangaAlert.js";
import { Store } from "../support/store.js";

type SeriesMap = Map<string, MangaAlert[]>;
type AlertsMap = Map<Guild, SeriesMap>;
export class NewChapterEventHandler {

  discord: DiscordClient;

  logger: Logger;
  // Events temporarily stored before being processed by bufferFlushTask
  eventBuffer: MangaAlert[];
  // Handle for timer task running bufferFlushTask
  bufferFlushHandle: NodeJS.Timeout;

  constructor(discord: DiscordClient) {
    this.discord = discord;
    this.logger = new Logger("NewChapterEventHandler");
    this.eventBuffer = [];
  }

  public async start(): Promise<void> {
    // Start running the timer task to flush and process events
    this.bufferFlushHandle = setInterval(this.bufferFlushTask, NEW_CHAPTER_EVENT_FLUSH_INVERVAL);
    this.logger.debug('Started processing events')
  }

  public async stop(): Promise<void> {
    // Stop running the timer task
    clearInterval(this.bufferFlushHandle);
    this.bufferFlushHandle = null;
    // Empty the event buffer
    this.eventBuffer = [];
  }

  public newChapterHandler = async (alert: MangaAlert): Promise<void> => {
    // If debug flag is set to disable this handler, just return
    if (NEW_CHAPTER_EVENT_DISABLED) {
      return;
    }

    // Add the event to the buffer
    this.eventBuffer.push(alert);
    this.logger.debug(`Added ${alert.guildId} => '${alert.mangaTitle} ${alert.mangaChapter.chapter}' to event buffer'`);
  }

  // Task to flush and process events in the buffer
  private bufferFlushTask = async (): Promise<void> => {
    this.logger.trace(`Running event buffer flush'`);

    // Check if there's any events to process
    // If not, just return
    const numToProcess = this.eventBuffer.length;
    if (numToProcess == 0) {
      return;
    }

    // Shift out numToProcess events from the buffer
    // This handles the case of events being added in while we're doing this
    const alertsToProcess: MangaAlert[] = [];
    for (let i = 0; i < numToProcess; i++) {
      alertsToProcess.push(this.eventBuffer.shift());
    }

    // Generate a map of alerts, collected by guild then series
    // Helps prevent a spam of pings when one series gets a bunch of updates
    // Guild => Series => Alerts[]
    const alertsMap: AlertsMap = new Map();
    for (const alert of alertsToProcess) {
      const guild = this.discord.guilds.cache.get(alert.guildId);
      if (guild == null) {
        this.logger.warn(`Notifying for a guild no longer available: ${alert.guildId} => ${alert.mangaChapter.titleId}`);
        continue;
      }

      // Get map of alerts for guild
      // Create map if not present
      let seriesMap = alertsMap.get(guild);
      if (seriesMap == null) {
        seriesMap = new Map();
        alertsMap.set(guild, seriesMap);
      }

      // Get array of alerts for series in guild
      // Create array if not present
      let seriesAlerts = seriesMap.get(alert.mangaChapter.titleId);
      if (seriesAlerts == null) {
        seriesAlerts = [];
        seriesMap.set(alert.mangaChapter.titleId, seriesAlerts);
      }

      // Finally, add alert to the array
      seriesAlerts.push(alert);
    }

    // Iterate over all the Guilds, series and roles to generate alerts
    for (const [guild, series] of alertsMap.entries()) {
      for (const alerts of series.values()) {
        this.generateAlertsOfSeries(guild, alerts);
      }
    }
  }

  private async generateAlertsOfSeries(guild: Guild, alerts: MangaAlert[]): Promise<void> {
    const rolesToNotifyPerChannel: Map<TextChannel, string[]> = new Map();
    // Get the roles to alert in this Guild
    // There will always be at least 1 alert,
    //  and all alerts of the same series will be for the same roles
    for (const roleId of alerts[0].rolesIds) {
      const notifChannel = await Store.getNotifChannel(guild.id, roleId);
      if (notifChannel == null) {
        // No channel to notify for this role, so just move on
        this.logger.debug(`No channel to alert for role: ${guild.id}, ${roleId}`);
        continue;
      }
      // Get TextChannel to to notify
      const channel = guild.channels.cache.get(notifChannel) as TextChannel;
      if (channel == null) {
        // No channel to notify for this role, so just move on
        this.logger.warn(`Channel to alert no longer available: ${guild.id}, ${roleId} => ${notifChannel}`);
        continue;
      }

      // Get array of roles to notify for a channel
      let rolesToNotify = rolesToNotifyPerChannel.get(channel);
      if (rolesToNotify == null) {
        rolesToNotify = [];
        rolesToNotifyPerChannel.set(channel, rolesToNotify);
      }

      // Add it to the map of roles to notify for the channel
      rolesToNotify.push(roleId);
    }

    // Ping the alert for every channel to alert
    for (const [channel, roles] of rolesToNotifyPerChannel.entries()) {
      let msg = '';
      const pingStr = roles.map(role => `<@&${role}>`).join(' ');
      const chapterNumbers: string[] = [];

      const firstAlert = alerts[0];
      if (alerts.length == 1) {
        // If there's only 1 alert, use the old style
        const pagesStr = firstAlert.mangaChapter.pageCount != null && firstAlert.mangaChapter.pageCount != 0 ? 
            `${firstAlert.mangaChapter.pageCount} pages - ` : '';

        msg = 
          `${firstAlert.mangaTitle} - Chapter ${firstAlert.mangaChapter.chapter} - ${pagesStr}${pingStr}\n` +
          `${firstAlert.mangaChapter.link}`;
        
        chapterNumbers.push(firstAlert.mangaChapter.chapter);
      } else {
        // More than one alert, time to get fancy
        const linkStrs: string[] = [];

        alerts.forEach(alert => {
          const pagesStr = alert.mangaChapter.pageCount != null && alert.mangaChapter.pageCount != 0 ? 
            ` - ${alert.mangaChapter.pageCount} pages` : '';
          
          chapterNumbers.push(alert.mangaChapter.chapter);
          linkStrs.push(`Chapter ${alert.mangaChapter.chapter} - <${alert.mangaChapter.link}>${pagesStr}`);
        });

        msg = `${firstAlert.mangaTitle}\n` +
            `${pingStr} Chapters ${chapterNumbers.join(', ')}\n` +
            `${linkStrs.join('\n')}`; 
      }

      try {
        this.logger.debug(`Notifying '${firstAlert.mangaTitle}' [ ${chapterNumbers.join(', ')} ] to ${guild.id}@${channel.id}`);
        sendMessage(channel, msg); 
      } catch (e) {
        this.logger.error(`Failed to send notification to ${guild.id}@${channel.id}: ${e}`);
      }
    }
  }

}