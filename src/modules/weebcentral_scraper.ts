import { CloudflareBypass } from "bot-framework";
import { ScraperType } from "../constants/scraper_types.js";

import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { WeebCentral } from "../support/weebcentral.js";
import { NewWeebCentralItemTopic } from "../constants/topics.js";

export class WeebCentralScraperImpl extends BaseScraper {

  // Sets of seen chapters
  seenUrls: Set<string>;
  // Date when scraping began
  startDate: Date;

  constructor() {
    super(ScraperType.WeebCentral);
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
      const chapters = await WeebCentral.getLatestChapters(this.startDate);
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
    return WeebCentral.parseWeebCentralMangaLink(uri);
  }

  public uriForId(id: string): string {
    return WeebCentral.toMangaUrl(id);
  }

  timerTask = async (): Promise<void> => {
    this.logger.debug('Running Weeb Central scraper');

    try {
      // Fetch chapters from now back until the date we started
      const latestChapters = await WeebCentral.getLatestChapters(this.startDate);
      
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

        const weebCentralChapter = new MangaChapter();
        weebCentralChapter.type = ScraperType.WeebCentral;
        weebCentralChapter.link = c.link;
        weebCentralChapter.titleId = c.seriesId;
        weebCentralChapter.chapter = c.chapter;
        weebCentralChapter.pageCount = null;

        this.logger.debug(`New Weeb Central item: ${c.seriesName} | ${c.chapter}`);
        NewWeebCentralItemTopic.notify(weebCentralChapter);
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export const WeebCentralScraper = new WeebCentralScraperImpl();