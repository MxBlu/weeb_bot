import { CloudflareBypass } from "bot-framework";
import { ScraperType } from "../constants/scraper_types.js";

import { NewMangaseeItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { MangadexHelper } from "../support/mangadex.js";
import { Mangasee } from "../support/mangasee.js";
import { Store } from "../support/store.js";

export class MangaseeScraperImpl extends BaseScraper {

  // Sets of seen chapters
  seenUrls: Set<string>;
  // Date when scraping began
  startDate: Date;

  constructor() {
    super(ScraperType.Mangasee);
    this.seenUrls = new Set();
    this.startDate = null;
  }

  public async init(): Promise<void> {
    // Run superclass init functions
    await super.init();
  }

  public async enable(): Promise<boolean> {
    // Enable parser, and set start date if successful
    if (await super.enable()) {
      this.startDate = new Date();
      return true;
    }
    return false;
  }
  
  public async disable(): Promise<boolean> {
    // Disable parser, and cleanup Puppeteer if successful
    if (await super.disable()) {
      // Stop any Puppeteer instances to save a bit of RAM
      await CloudflareBypass.ensureUnloaded();
      return true;
    }
    return false;
  }

  public async parseItemFromUri(uri: string): Promise<Subscribable> {
    // Use Mangadex uri parsing since we really just want to use this as fallback
    return MangadexHelper.parseTitleUrlToMangaLite(uri);
  }

  timerTask = async (): Promise<void> => {
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
        mChapter.type = ScraperType.Mangadex; // This is masquerading as a Mangadex chapter for subscriptions
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