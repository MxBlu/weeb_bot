import { Dependency, Logger } from 'bot-framework';
import Fuse from 'fuse.js';
import mongoose from 'mongoose';

import { ScraperType } from '../constants/scraper_types.js';
import { FutureComputingMap } from './computing_map.js';
import { ScraperHelper } from './scrapers.js';
import { NotifChannelModel } from '../models/NotifChannel.js';
import { Subscription, SubscriptionModel } from '../models/Subscription.js';
import { MangaInfoModel } from '../models/MangaInfo.js';
import { ScraperStatusModel } from '../models/ScraperStatus.js';

/*
  API class to interact with underlying storage implementation
*/
class StoreImpl {

  // Current guilds
  guilds: Set<string>;
  // General logger
  logger: Logger;

  constructor () {
    this.logger = new Logger('Store');
    this.guilds = new Set();
  }

  // Create client and register handlers
  public init(mongoUri: string): void {
    this.registerMongoHandlers();

    mongoose.connect(mongoUri, { autoCreate: true, autoIndex: true });
  }

  private registerMongoHandlers(): void {
    mongoose.connection.on('error', (err) => {  
      this.logger.error(`MongoDB error: ${err}`);
    });
  
    mongoose.connection.once('open', () => {
      this.logger.info('MongoDB connected');
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

  // Get operating channel for a given role and guild
  public async getNotifChannel(guildId: string, roleId: string): Promise<string | null> {
    const notifChannel = await NotifChannelModel.findOne({ guildId, roleId });
    return notifChannel?.channelId;
  }

  // Set operating channel for a given role and guild
  public async setNotifChannel(guildId: string, roleId: string, channelId: string): Promise<void> {
    await NotifChannelModel.findOneAndUpdate({
      guildId,
      roleId
    }, { 
      channelId
    }, { upsert: true });
  }
  
  // Delete operating channel for a given role and guild
  public async delNotifChannel(guildId: string, roleId: string): Promise<void> {
    await NotifChannelModel.deleteOne({
      guildId,
      roleId
    });
  }

  // Fetch alertable titles for a given role and guild, returns set
  public async getSubscriptionsForRole(guildId: string, roleId: string, type?: ScraperType): Promise<Subscription[]> {
    if (type != null) {
      return await SubscriptionModel.find({
        guildId,
        roleId,
        scraperType: type
      });
    } else {
      return await SubscriptionModel.find({
        guildId,
        roleId
      });
    }
  }

  // Fetch alertable titles for a given role and guild, returns set
  public async getSubscriptionsForTitle(type: ScraperType, titleId: string): Promise<Subscription[]> {
    return await SubscriptionModel.find({
      titleId,
      scraperType: type
    });
  }

  // Add alertable title for a given role and guild
  public async addSubscription(guildId: string, roleId: string, type: ScraperType, titleId: string): Promise<void> {
    // Ensure a subscription exists, upsert it so we don't duplicate it
    await SubscriptionModel.findOneAndUpdate({
      guildId,
      roleId,
      scraperType: type,
      titleId
    }, { }, { upsert: true });
    await Cache.invalidate(guildId, roleId, type);
  }

  // Delete alertable title for a given role and guild
  public async delSubscription(guildId: string, roleId: string, type: ScraperType, titleId: string): Promise<void> {
    await SubscriptionModel.deleteOne({
      guildId,
      roleId,
      scraperType: type,
      titleId
    });
    await Cache.invalidate(guildId, roleId, type);
  }

  // Delete all alertable titles for a given role and guild
  public async clearSubscriptions(guildId: string, roleId: string, type: ScraperType): Promise<void> {
    await SubscriptionModel.deleteMany({
      guildId,
      roleId,
      scraperType: type
    });
    await Cache.invalidate(guildId, roleId, type);
  }

  // Fetch title name for a given title id
  public async getTitleName(type: ScraperType, titleId: string): Promise<string> {
    const manga = await MangaInfoModel.findOne({
      scraperType: type,
      id: titleId
    });
    return manga?.title;
  }

  // Set title name for a given title id
  public async setTitleName(type: ScraperType, titleId: string, titleName: string): Promise<void> {
    await MangaInfoModel.findOneAndUpdate({
      scraperType: type,
      id: titleId
    }, {
      title: titleName
    }, { upsert: true });
  }

  // Delete title name for a given title id
  public async delTitleInfo(type: ScraperType, titleId: string): Promise<void> {
    await MangaInfoModel.deleteOne({
      scraperType: type,
      id: titleId
    });
  }

  // Check whether this title's link should be spoilered - prevents chapter link embed
  public async isTitleEmbedDisabled(type: ScraperType, titleId: string): Promise<boolean> {
    const manga = await MangaInfoModel.findOne({
      scraperType: type,
      id: titleId
    });
    return manga?.embedDisabled == true;
  }

  // Set whether this title's link should be spoilered
  public async setTitleEmbedDisabled(type: ScraperType, titleId: string, disabled: boolean): Promise<void> {
    await MangaInfoModel.findOneAndUpdate({
      scraperType: type,
      id: titleId
    }, {
      embedDisabled: disabled
    });
  }

  // Check if a given scraper is enabled
  public async isScraperEnabled(type: ScraperType): Promise<boolean> {
    const scraperStatus = await ScraperStatusModel.findOne({
      scraperType: type
    });
    return scraperStatus?.enabled ?? true; // Default to true if no status in db
  }

  // Set parsing status of a given parser
  public async setScraperEnabled(type: ScraperType, enabled: boolean): Promise<void> {
    await ScraperStatusModel.findOneAndUpdate({
      scraperType: type
    }, {
      enabled
    }, { upsert: true });
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

    const subscriptions = await Store.getSubscriptionsForRole(guildId, roleId, type);
    return Promise.all(Array.from(subscriptions)
      .map(async sub => ({ 
          title: await Store.getTitleName(sub.scraperType, sub.titleId),
          scraper: ScraperType[sub.scraperType],
          url: ScraperHelper.getScraperForType(sub.scraperType).uriForId(sub.titleId)
      })));
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