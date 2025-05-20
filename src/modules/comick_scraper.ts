import { ScraperType } from "../constants/scraper_types.js";
import { NewComickItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { Comick } from "../support/comick.js";

export class ComickScraperImpl extends BaseScraper {

  // Sets of seen chapters
  seenUrls: Set<string>;
  // Date when scraping began
  startDate: Date;

  constructor() {
    super(ScraperType.Comick);
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
      const chapters = await Comick.getLatestChapters(this.startDate);
      // Mark these chapters as seen if there are any
      if (chapters != null) {
        chapters.forEach(chapter => this.seenUrls.add(chapter.link));
      }
      
      return true;
    }
    return false;
  }

  public async parseItemFromUri(uri: string): Promise<Subscribable> {
    return Comick.parseComickMangaLink(uri);
  }

  public uriForId(id: string): string {
    return Comick.toMangaUrl(id);
  }

  timerTask = async (): Promise<void> => {
    this.logger.debug('Running Comick scraper');

    try {
      // Fetch chapters from now back until the date we started
      const latestChapters = await Comick.getLatestChapters(this.startDate);
      
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
        weebCentralChapter.type = ScraperType.Comick;
        weebCentralChapter.link = c.link;
        weebCentralChapter.titleId = c.seriesSlug;
        weebCentralChapter.chapter = c.chap;
        weebCentralChapter.pageCount = null;

        this.logger.debug(`New Weeb Central item: ${c.seriesTitle} | ${c.chap}`);
        NewComickItemTopic.notify(weebCentralChapter);
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export const ComickScraper = new ComickScraperImpl();