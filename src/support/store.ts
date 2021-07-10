import { Dependency, Logger } from 'bot-framework';
import IORedis, { Redis } from 'ioredis';

/*
  API class to interact with underlying storage implementation
  In this case, Redis

  Schema:
    <guildId>_roles: String                   # Roles with subscriptions for a given guild ID
    <guildId>_<roleId>_notifChannel: String   # Channel ID to notify for alerts
    <guildId>_<roleId>_titles: Set<String>    # Title IDs to generate alerts for
    title_<titleId>: String                   # Friendly title name for a given title ID
    mangadex_enabled: Boolean                 # State of Mangadex parser
    mangasee_enabled: Boolean                 # State of Mangasee parser
    title_<titleId>_altTitles                 # Alternative title(s) (or ID(s)) for a given title Id
    mangasee_altTitles_<altTitleId>           # Inverted lookup for title IDs from alternative title IDs
*/
class StoreImpl {

  // Redis client
  rclient: Redis;
  // Current guilds
  guilds: Set<string>;
  // General logger
  logger: Logger;

  constructor () {
    this.guilds = new Set();
    this.logger = new Logger("Store");
  }

  // Create client and register handlers
  public init(host: string, port: number): void {
    this.rclient = new IORedis(port, host);

    this.rclient.on('error', (err) => {
      this.logger.error(`Redis error: ${err}`);
    });

    this.rclient.once('connect', () => {
      this.logger.info('Redis connected');
      StoreDependency.ready();
    });
  }

  // Return guilds set
  public getGuilds(): Set<string> {
    return this.guilds;
  }

  // Add all args as guilds to guild set
  public addGuilds(...guildIds: string[]): void{
    guildIds.forEach((g) => this.guilds.add(g));
  }

  // Remove guild from guild set
  public removeGuild(guildId: string): void {
    this.guilds.delete(guildId);
  }

  // Fetch roles from db for a given guild, returns set
  public async getRoles(guildId: string): Promise<Set<string>> {
    return new Set(await this.rclient.smembers(`${guildId}_roles`));
  }

  // Add role to db for a given guild
  public async addRole(guildId: string, roleId: string): Promise<void> {
    await this.rclient.sadd(`${guildId}_roles`, roleId);
  }

  // Delete role from db for a given guild
  public async delRole(guildId: string, roleId: string): Promise<void> {
    await this.rclient.srem(`${guildId}_roles`, roleId);
  }

  // Get operating channel for a given role and guild
  public async getNotifChannel(guildId: string, roleId: string): Promise<string> {
    return this.rclient.get(`${guildId}_${roleId}_notifChannel`);
  }

  // Set operating channel for a given role and guild
  public async setNotifChannel(guildId: string, roleId: string, channelId: string): Promise<void> {
    await this.rclient.set(`${guildId}_${roleId}_notifChannel`, channelId);
  }
  
  // Delete operating channel for a given role and guild
  public async delNotifChannel(guildId: string, roleId: string): Promise<void> {
    await this.rclient.del(`${guildId}_${roleId}_notifChannel`);
  }

  // Fetch alertable titles for a given role and guild, returns set
  public async getTitles(guildId: string, roleId:string): Promise<Set<string>> {
    return new Set(await this.rclient.smembers(`${guildId}_${roleId}_titles`));
  }

  // Add alertable title for a given role and guild
  public async addTitle(guildId: string, roleId: string, titleId: string): Promise<void> {
    await this.rclient.sadd(`${guildId}_${roleId}_titles`, titleId);
  }

  // Delete alertable title for a given role and guild
  public async delTitle(guildId: string, roleId: string, titleId: string): Promise<void> {
    await this.rclient.srem(`${guildId}_${roleId}_titles`, titleId);
  }

  // Delete all alertable titles for a given role and guild
  public async clearTitles(guildId: string, roleId: string): Promise<void> {
    await this.rclient.del(`${guildId}_${roleId}_titles`);
  }

  // Fetch title name for a given title id
  public async getTitleName(titleId: string): Promise<string> {
    return this.rclient.get(`title_${titleId}`);
  }

  // Set title name for a given title id
  public async setTitleName(titleId, titleName): Promise<void> {
    await this.rclient.set(`title_${titleId}`, titleName);
  }

  // Delete title name for a given title id
  public async delTitleName(titleId): Promise<void> {
    await this.rclient.del(`title_${titleId}`);
  }

  public async isMangadexEnabled(): Promise<boolean> {
    return await this.rclient.get('mangadex_enabled') == 'true';
  }

  // Set Mangasee parsing status
  public async setMangadexEnabled(enabled: boolean): Promise<void> {
    await this.rclient.set('mangadex_enabled', enabled == true ? 'true' : 'false');
  }

  // Mangasee hackjobs

  // Check is Mangasee parsing is enabled
  public async isMangaseeEnabled(): Promise<boolean> {
    return await this.rclient.get('mangasee_enabled') == 'true';
  }

  // Set Mangasee parsing status
  public async setMangaseeEnabled(enabled: boolean): Promise<void> {
    await this.rclient.set('mangasee_enabled', enabled == true ? 'true' : 'false');
  }

  // Get alternative titles (for Mangasee parsing) for a given titleId
  public async getAltTitles(titleId: string): Promise<Set<string>> {
    return new Set(await this.rclient.smembers(`title_${titleId}_altTitles`));
  }

  // Add an alternative title for a given titleId
  public async addAltTitle(titleId: string, altTitle: string): Promise<void> {
    await this.rclient.sadd(`title_${titleId}_altTitles`, altTitle);
    await this.rclient.set(`mangasee_altTitles_${altTitle}`, titleId);
  }

  // Delete an alternative title for a given titleId
  public async delAltTitle(titleId: string, altTitle: string): Promise<void> {
    await this.rclient.srem(`title_${titleId}_altTitles`, altTitle);
    await this.rclient.del(`mangasee_altTitles_${altTitle}`, titleId);
  }

  // Remove all alt tiltes for a given titleId
  public async clearAltTitles(titleId: string): Promise<void> {
    const altTitles = await this.rclient.smembers(`title_${titleId}_altTitles`);
    for (const altTitle of altTitles) {
      await this.rclient.del(`mangasee_altTitles_${altTitle}`);
    }
    await this.rclient.del(`title_${titleId}_altTitles`);
  }

  // Get titleId for a given altTitle
  public async getTitleIdForAlt(altTitle): Promise<string> {
    return await this.rclient.get(`mangasee_altTitles_${altTitle}`);
  }
 
}

export const Store = new StoreImpl();

export const StoreDependency = new Dependency("Store");