import { CloudflareBypass, Logger } from "bot-framework";

import { MANGASEE_DISABLED, MANGASEE_REFRESH_INTERVAL } from "../constants/constants.js";
import { NewMangaseeItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Mangasee } from "../support/mangasee.js";
import { Store } from "../support/store.js";

export class MangaseeScraperImpl {

  logger: Logger;
  // Sets of seen chapters
  seenUrls: Set<string>;
  // Inverval handle for timer task
  handle: NodeJS.Timeout;
  // Date when scraping began
  startDate: Date;

  constructor() {
    this.seenUrls = new Set();
    this.handle = null;
    this.logger = new Logger("MangaseeScraper");
  }

  public async init(): Promise<void> {
    // If disabled in env, don't start timerTask
    if (MANGASEE_DISABLED) {
      this.logger.warn("Mangasee parsing explicitly disabled");
      return;
    }

    if (isNaN(MANGASEE_REFRESH_INTERVAL)) {
      this.logger.error("Invalid refresh interval for Mangasee");
      return;
    }

    if (await Store.isMangaseeEnabled()) {
      // Enable the scraper
      this.enable();
    }
  }

  public async enable(): Promise<void> {
    if (this.handle == null) {
      // Run timerTask at regular intervals 
      this.startDate = new Date();
      this.handle = setInterval(this.timerTask, MANGASEE_REFRESH_INTERVAL);
      // Store setting in DB
      await Store.setMangaseeEnabled(true);
      this.logger.info("Mangasee parser enabled");
    }
  }
  
  public async disable(): Promise<void> {
    if (this.handle != null) {
      // Stop timerRask runs
      clearInterval(this.handle);
      this.handle = null;
      // Store setting in DB
      await Store.setMangaseeEnabled(false);
      // Stop any Puppeteer instances to save a bit of RAM
      await CloudflareBypass.ensureUnloaded();
      this.logger.info("Mangasee parser disabled");
    }
  }

  private timerTask = async (): Promise<void> => {
    this.logger.debug('Running Mangasee scraper');

    try {
      // Fetch chapters from now back until the date we started
      const latestChapters = await Mangasee.getLatestChapters(this.startDate);

      latestChapters.forEach(async c => {
        // Avoid double notifications
        if (this.seenUrls.has(c.link)) {
          return;
        }
        this.seenUrls.add(c.link);
        
        this.logger.debug(`New Mangasee item: ${c.seriesName} | ${c.chapterNumber}`);

        // Get the titleId for the series
        // If none exists, we don't have anything to go off to send notifications
        const titleId = await Store.getTitleIdForAlt(c.seriesName);
        if (titleId == null) {
          return;
        }

        const mChapter = new MangaChapter();
        mChapter.link = c.link;
        mChapter.titleId = titleId;
        mChapter.chapterNumber = c.chapterNumber;
        mChapter.pageCount = null;

        this.logger.debug(`New Mangasee alertable: ${mChapter.titleId} | ${mChapter.chapterNumber}`);
        NewMangaseeItemTopic.notify(mChapter);
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export const MangaseeScraper = new MangaseeScraperImpl();