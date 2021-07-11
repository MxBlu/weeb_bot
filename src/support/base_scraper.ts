import * as dotenv from 'dotenv';
dotenv.config();

import { Logger } from "bot-framework";

import { Store, StoreDependency } from './store.js';
import { ScraperType } from '../constants/scraper_types.js';
import { Subscribable } from '../models/Subscribable.js';
import { ScraperHelper } from './scrapers.js';

// Simple Scraper interface for lookup use
export interface IScraper {
  enable(): Promise<boolean>;

  disable(): Promise<boolean>;

  isEnabled(): Promise<boolean>;

  isExplicitlyDisabled(): boolean;

  parseItemFromUri(uri: string): Promise<Subscribable>;

  uriForId(id: string): string;
}

export class BaseScraper implements IScraper {
  // Name of parser - just a convenience since it comes from `type`
  name: string;
  // Scraper type enum
  type: ScraperType;
  // Refresh interval
  interval: number;
  // Logger instance for scraper - must be initialised by superclass
  logger: Logger;
  // Inverval handle for timer task
  handle: NodeJS.Timeout;
  // Task to call on timer interval
  timerTask: () => Promise<void>;

  constructor(type: ScraperType) {
    this.name = ScraperType[type];
    this.type = type;
    this.logger = new Logger(`Scraper.${this.name}`);
    this.handle = null;
  }

  public async init(): Promise<void> {
    ScraperHelper.registerScraper(this, this.type);

    // Ensure a timerTask is defined
    if (this.timerTask == null) {
      throw `${this.name} scraper does not have a timerTask defined`;
    }

    // If disabled in env, don't start timerTask
    if (this.isExplicitlyDisabled()) {
      this.logger.warn(`${this.name} scraping explicitly disabled`);
      return;
    }

    // Get interval from env
    this.interval = Number(process.env[`Scraper.${this.name}.INTERVAL`]);
    if (isNaN(this.interval)) {
      throw `Invalid refresh interval for ${this.name} scraper`;
    }

    // Ensure the Store is intialised
    await StoreDependency.await();

    // Check the status of the scraper in the DB, enable if was last enabled
    if (await this.isEnabled()) {
      this.enable();
    }
  }

  // Enable the parser, returns false if parser was already running
  public async enable(): Promise<boolean> {
    if (this.handle == null) {
      // Store setting in DB
      await Store.setScraperEnabled(this.type, true);
      // Run timerTask at regular intervals
      this.handle = setInterval(this.timerTask, this.interval);
      this.logger.info(`${this.name} scraper enabled`);
      return true;
    }
    return false;
  }
  
  // Enable the parser, returns false if parser was already stopped
  public async disable(): Promise<boolean> {
    if (this.handle != null) {
      // Stop timerRask runs
      clearInterval(this.handle);
      this.handle = null;
      // Store setting in DB
      await Store.setScraperEnabled(this.type, false);
      this.logger.info(`${this.name} scraper disabled`);
      return true;
    }
    return false;
  }

  // Returns whether parser is enabled
  public async isEnabled(): Promise<boolean> {
    return !this.isExplicitlyDisabled() && await Store.isScraperEnabled(this.type);
  }

  // Returns whether parser has been explicitly disabled in env
  public isExplicitlyDisabled(): boolean {
    return process.env[`Scraper.${this.name}.DISABLED`] === 'true';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public parseItemFromUri(uri: string): Promise<Subscribable> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public uriForId(id: string): string {
    throw new Error('Method not implemented.');
  }
}