import { Dependency, Logger } from 'bot-framework';
import Fuse from 'fuse.js';
import IORedis, { Redis } from 'ioredis';

import { ScraperType } from '../constants/scraper_types.js';
import { FutureComputingMap } from './computing_map.js';
import { ScraperHelper } from './scrapers.js';

/*
  API class to interact with underlying storage implementation
  In this case, Redis

  Schema:
    <guildId>_roles: String                                 # Roles with subscriptions for a given guild ID
    <guildId>_<roleId>_notifChannel: String                 # Channel ID to notify for alerts
    <guildId>_<roleId>_<scraperType>_titles: Set<String>    # Title IDs to generate alerts for
    title_<scraperType>_<titleId>: String                   # Friendly title name for a given title ID
    <scraperType>_enabled: Boolean                          # State for a given parser
    title_<titleId>_altTitles                               # LEGACY - Alternative title(s) (or ID(s)) for a given title Id
    mangasee_altTitles_<altTitleId>                         # LEGACY - Inverted lookup for title IDs from alternative title IDs
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
  public async getTitles(guildId: string, roleId:string, type: ScraperType): Promise<Set<string>> {
    return new Set(await this.rclient.smembers(`${guildId}_${roleId}_${ScraperType[type]}_titles`));
  }

  // Add alertable title for a given role and guild
  public async addTitle(guildId: string, roleId: string, type: ScraperType, titleId: string): Promise<void> {
    await this.rclient.sadd(`${guildId}_${roleId}_${ScraperType[type]}_titles`, titleId);
    await Cache.invalidate(guildId, roleId, type);
  }

  // Delete alertable title for a given role and guild
  public async delTitle(guildId: string, roleId: string, type: ScraperType, titleId: string): Promise<void> {
    await this.rclient.srem(`${guildId}_${roleId}_${ScraperType[type]}_titles`, titleId);
    await Cache.invalidate(guildId, roleId, type);
  }

  // Delete all alertable titles for a given role and guild
  public async clearTitles(guildId: string, roleId: string, type: ScraperType): Promise<void> {
    await this.rclient.del(`${guildId}_${roleId}_${ScraperType[type]}_titles`);
    await Cache.invalidate(guildId, roleId, type);
  }

  // Fetch title name for a given title id
  public async getTitleName(type: ScraperType, titleId: string): Promise<string> {
    return this.rclient.get(`title_${ScraperType[type]}_${titleId}`);
  }

  // Set title name for a given title id
  public async setTitleName(type: ScraperType, titleId: string, titleName: string): Promise<void> {
    await this.rclient.set(`title_${ScraperType[type]}_${titleId}`, titleName);
  }

  // Delete title name for a given title id
  public async delTitleName(type: ScraperType, titleId: string): Promise<void> {
    await this.rclient.del(`title_${ScraperType[type]}_${titleId}`);
  }

  // Check whether this title's link should be spoilered - prevents chapter link embed
  public async isTitleEmbedDisabled(type: ScraperType, titleId: string): Promise<boolean> {
    return await this.rclient.get(`title_${ScraperType[type]}_${titleId}_embedDisabled`) == 'true';
  }

  // Set whether this title's link should be spoilered
  public async setTitleEmbedDisabled(type: ScraperType, titleId: string, disabled: boolean): Promise<void> {
    await this.rclient.set(`title_${ScraperType[type]}_${titleId}_embedDisabled`, disabled == true ? 'true' : 'false');
  }

  // Check if a given scraper is enabled
  public async isScraperEnabled(type: ScraperType): Promise<boolean> {
    return await this.rclient.get(`${ScraperType[type]}_enabled`) == 'true';
  }

  // Set parsing status of a given parser
  public async setScraperEnabled(type: ScraperType, enabled: boolean): Promise<void> {
    await this.rclient.set(`${ScraperType[type]}_enabled`, enabled == true ? 'true' : 'false');
  }

  // Mangasee hackjobs

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
  public async getTitleIdForAlt(altTitle: string): Promise<string> {
    return await this.rclient.get(`mangasee_altTitles_${altTitle}`);
  }
 
}

export interface TitleCacheRecord {
  title: string;
  scraper: string;
  url: string;
}

type RoleTitleCacheL1 = FutureComputingMap<string, RoleTitleCacheL2>;
type RoleTitleCacheL2 = FutureComputingMap<string, RoleTitleCacheL3>;
type RoleTitleCacheL3 = FutureComputingMap<ScraperType, TitleCacheRecord[]>;

type RoleTitleSearchCacheL1 = FutureComputingMap<string, RoleTitleSearchCacheL2>;
type RoleTitleSearchCacheL2 = FutureComputingMap<string, RoleTitleSearchCacheL3>;
type RoleTitleSearchCacheL3 = FutureComputingMap<ScraperType, Fuse<TitleCacheRecord>>;

class CacheImpl {

  titlesPerRole: RoleTitleCacheL1;

  titlesPerRoleSeaches: RoleTitleSearchCacheL1;

  constructor() {
    // Cache for title records
    this.titlesPerRole = new FutureComputingMap<string, RoleTitleCacheL2>(
      async guildId => new FutureComputingMap<string, RoleTitleCacheL3>(
        async roleId => new FutureComputingMap<ScraperType, TitleCacheRecord[]>(
          scraper => this.generateCacheRecords(guildId, roleId, scraper))));
    // Cache for searches across title records
    this.titlesPerRoleSeaches = new FutureComputingMap<string, RoleTitleSearchCacheL2>(
      async guildId => new FutureComputingMap<string, RoleTitleSearchCacheL3>(
        async roleId => new FutureComputingMap<ScraperType, Fuse<TitleCacheRecord>>(
          scraper => this.generateSearch(guildId, roleId, scraper))));
  }

  public async getTitleRecordsAll(guildId: string, roleId: string): Promise<TitleCacheRecord[]> {
    return this.getTitleRecordsTyped(guildId, roleId, null);
  }

  public async getTitleRecordsTyped(guildId: string, roleId: string, 
      type: ScraperType): Promise<TitleCacheRecord[]> {
    return this.titlesPerRole.get(guildId)
      .then(l2 => l2.get(roleId))
      .then(l3 => l3.get(type));
  }

  public async getSearchAll(guildId: string, roleId: string): Promise<Fuse<TitleCacheRecord>> {
    return this.getSearchTyped(guildId, roleId, null);
  }

  public async getSearchTyped(guildId: string, roleId: string, 
      type: ScraperType): Promise<Fuse<TitleCacheRecord>> {
    return this.titlesPerRoleSeaches.get(guildId)
      .then(l2 => l2.get(roleId))
      .then(l3 => l3.get(type));
  }

  public async invalidate(guildId: string, roleId: string, type: ScraperType) {
    // Remove records
    await this.titlesPerRole.get(guildId)
      .then(l2 => l2.get(roleId))
      .then(l3 => {
        l3.delete(type);
        // null type is the 'all' entry, always invalidate that too
        if (type != null) {
          l3.delete(null);
        }
      });
    // Remove searches
    await this.titlesPerRoleSeaches.get(guildId)
      .then(l2 => l2.get(roleId))
      .then(l3 => {
        l3.delete(type);
        // null type is the 'all' entry, always invalidate that too
        if (type != null) {
          l3.delete(null);
        }
      });
  }

  private async generateCacheRecords(guildId: string, roleId: string, 
      type: ScraperType): Promise<TitleCacheRecord[]> {
    // Ensure store is ready before generating
    await StoreDependency.await();

    if (type != null) {
      // If a type is present, get the specific values for the type
      const scraper = ScraperHelper.getScraperForType(type);
      const titleIds = await Store.getTitles(guildId, roleId, type);
      return Promise.all(Array.from(titleIds)
        .map(async id => ({ 
            title: await Store.getTitleName(type, id),
            scraper: ScraperType[type],
            url: scraper.uriForId(id)
        })));
    } else {
      // Generate records for all scraper types
      let titleNames: TitleCacheRecord[] = [];
      // Iterate over all types, append records for each
      for (const iType of ScraperHelper.getAllRegisteredScraperTypes()) {
        const scraper = ScraperHelper.getScraperForType(iType);
        const titleIds = await Store.getTitles(guildId, roleId, iType);
        titleNames = titleNames.concat(await Promise.all(Array.from(titleIds)
          .map(async id => ({ 
            title: await Store.getTitleName(iType, id),
            scraper: ScraperType[iType],
            url: scraper.uriForId(id)
          }))));
      }
      return titleNames;
    }
  }

  private async generateSearch(guildId: string, roleId: string, 
      type: ScraperType): Promise<Fuse<TitleCacheRecord>> {
    const records = await this.getTitleRecordsTyped(guildId, roleId, type);
    return new Fuse(records, { keys: [ 'title' ] });
  }

}

export const Store = new StoreImpl();
export const Cache = new CacheImpl();

export const StoreDependency = new Dependency("Store");