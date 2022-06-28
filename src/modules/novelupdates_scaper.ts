import { CloudflareBypass } from "bot-framework";

import { ScraperType } from "../constants/scraper_types.js";
import { NewNovelUpdatesItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { NovelUpdates } from "../support/novelupdates.js";

export class NovelUpdatesScraperImpl extends BaseScraper {

  // Sets of seen chapters
  seenUrls: Set<string>;

  constructor() {
    super(ScraperType.NovelUpdates);
    this.seenUrls = new Set();
  }

  public async init(): Promise<void> {
    await super.init();
  }

  public async enable(): Promise<boolean> {
    if (await super.enable()) {
      // On init, add every chapter currently on the site to the seen set
      // This works around the lack of date
      const chapters = await NovelUpdates.getLatestChapters();
      chapters.forEach(chapter => this.seenUrls.add(chapter.releaseUrl));

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
    return NovelUpdates.parseMangaLink(uri);
  }

  public uriForId(id: string): string {
    return NovelUpdates.toMangaUrl(id);
  }

  public shouldEmbed(): boolean {
    // To prevent spoilers
    return false;
  }

  timerTask = async (): Promise<void> => {
    this.logger.debug('Running NovelUpdates scraper');

    try {
      // Fetch chapters sorted by latest
      const latestChapters = await NovelUpdates.getLatestChapters();

      // Reverse the order of the chapters to go from earliest to latest
      latestChapters.reverse().forEach(async c => {
        // Ignore chapters we've already seen
        if (this.seenUrls.has(c.releaseUrl)) {
          return;
        }
        this.seenUrls.add(c.releaseUrl);

        const mangaChapter = new MangaChapter();
        mangaChapter.type = ScraperType.NovelUpdates;
        mangaChapter.link = c.releaseUrl;
        mangaChapter.titleId = c.seriesId;
        mangaChapter.chapter = c.releaseTitle;
        mangaChapter.pageCount = null;

        this.logger.debug(`New NovelUpdates item: ${c.seriesTitle} | ${c.releaseTitle}`);
        NewNovelUpdatesItemTopic.notify(mangaChapter);
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export const NovelUpdatesScraper = new NovelUpdatesScraperImpl();