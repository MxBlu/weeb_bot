import * as dotenv from 'dotenv';
dotenv.config();

import { Logger } from "bot-framework";

import { Store } from './store.js';

export class BaseScraper {
  // Name of parser
  name: string;
  // Refresh interval
  interval: number;
  // Logger instance for scraper - must be initialised by superclass
  logger: Logger;
  // Inverval handle for timer task
  handle: NodeJS.Timeout;
  // Task to call on timer interval
  timerTask: () => Promise<void>;

  constructor(name: string) {
    this.name = name;
    this.handle = null;
  }

  public async init(): Promise<void> {
    // Ensure logger is initialised
    if (this.logger == null) {
      throw `Scraper '${this.name}' has not initialised logger`;
    }

    // Ensure a timerTask is defined
    if (this.timerTask == null) {
      throw `Scraper '${this.name}' does not have a timerTask defined`;
    }

    // If disabled in env, don't start timerTask
    if (this.isExplicitlyDisabled()) {
      this.logger.warn(`${this.name} parsing explicitly disabled`);
      return;
    }

    // Get interval from env
    this.interval = Number(process.env[`${this.name}.INTERVAL`]);
    if (isNaN(this.interval)) {
      throw `Invalid refresh interval for ${this.name}`;
    }

    // Check the status of the scraper in the DB, enable if was last enabled
    if (await this.isEnabled()) {
      this.enable();
    }
  }

  // Enable the parser, returns false if parser was already running
  public async enable(): Promise<boolean> {
    if (this.handle == null) {
      // Store setting in DB
      await Store.setScraperEnabled(this.name, true);
      // Run timerTask at regular intervals
      this.handle = setInterval(this.timerTask, this.interval);
      this.logger.info(`${this.name} parser enabled`);
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
      await Store.setScraperEnabled(this.name, false);
      this.logger.info(`${this.name} parser disabled`);
      return true;
    }
    return false;
  }

  // Returns whether parser is enabled
  public async isEnabled(): Promise<boolean> {
    return !this.isExplicitlyDisabled() && await Store.isScraperEnabled(this.name);
  }

  // Returns whether parser has been explicitly disabled in env
  public isExplicitlyDisabled(): boolean {
    return process.env[`${this.name}.DISABLED`] === 'true';
  }
}