import { CloudflareBypass } from "bot-framework";
import { ScraperType } from "../constants/scraper_types.js";

import { NewMangaseeFallbackItemTopic, NewMangaseeItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { Mangasee } from "../support/mangasee.js";
import { Store } from "../support/store.js";
import { MangaseeFallbackScraper } from "./mangasee_fallback_scraper.js";

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
      chapters.forEach(chapter => this.seenUrls.add(chapter.link));
      
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

        if (await MangaseeFallbackScraper.isEnabled()) {
          // Get the titleId for the series
          // If it exists, also notify as a Mangadex item
          const titleId = await Store.getTitleIdForAlt(c.seriesName);
          if (titleId == null) {
            return;
          }

          this.logger.debug(`New Mangasee fallback alertable: ${titleId} | ${c.chapter}`);
          const fallbackChapter = new MangaChapter();
          fallbackChapter.type = ScraperType.Mangadex; // This is masquerading as a Mangadex chapter for subscriptions
          fallbackChapter.link = c.link;
          fallbackChapter.titleId = titleId;
          fallbackChapter.chapter = c.chapter;
          fallbackChapter.pageCount = null;
          NewMangaseeFallbackItemTopic.notify(fallbackChapter);
        }
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export const MangaseeScraper = new MangaseeScraperImpl();