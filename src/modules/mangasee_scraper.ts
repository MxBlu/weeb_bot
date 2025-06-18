import { CloudflareBypass } from "bot-framework/cloudflare_bypass";
import { ScraperType } from "../constants/scraper_types.js";

import { NewMangaseeFallbackItemTopic, NewMangaseeItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
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

      // On init, add every chapter currently on the site to the seen set
      // This prevents repeat notifs for new chapters
      const chapters = await Mangasee.getLatestChapters(this.startDate);
      // Mark these chapters as seen if there are any
      if (chapters != null) {
        chapters.forEach(chapter => this.seenUrls.add(chapter.link));
      }
      
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
    return Mangasee.parseMangaseeMangaLink(uri);
  }

  public uriForId(id: string): string {
    return Mangasee.toMangaUrl(id);
  }

  timerTask = async (): Promise<void> => {
    this.logger.debug('Running Mangasee scraper');

    try {
      // Fetch chapters from now back until the date we started
      const latestChapters = await Mangasee.getLatestChapters(this.startDate);

      // Make sure we succesfully get chapters first
      if (latestChapters == null) {
        return;
      }

      // Iterate backwards to go from earliest to latest
      latestChapters.reverse().forEach(async c => {
        // Avoid double notifications
        if (this.seenUrls.has(c.link)) {
          return;
        }
        this.seenUrls.add(c.link);

        const mangaseeChapter = new MangaChapter();
        mangaseeChapter.type = ScraperType.Mangasee;
        mangaseeChapter.link = c.link;
        mangaseeChapter.titleId = c.seriesId;
        mangaseeChapter.chapter = c.chapter;
        mangaseeChapter.pageCount = null;

        this.logger.debug(`New Mangasee item: ${c.seriesName} | ${c.chapter}`);
        NewMangaseeItemTopic.notify(mangaseeChapter);
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export const MangaseeScraper = new MangaseeScraperImpl();