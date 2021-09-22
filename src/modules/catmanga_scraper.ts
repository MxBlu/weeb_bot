import { CloudflareBypass } from "bot-framework";
import { ScraperType } from "../constants/scraper_types.js";

import { NewCatMangaItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { CatManga } from "../support/catmanga.js";

export class CatMangaScraperImpl extends BaseScraper {

  // Sets of seen chapters
  seenUrls: Set<string>;

  constructor() {
    super(ScraperType.CatManga);
    this.seenUrls = new Set();
  }

  public async init(): Promise<void> {
    await super.init();
  }

  public async enable(): Promise<boolean> {
    if (await super.enable()) {
      // On init, add every chapter currently on the site to the seen set
      // This works around the lack of date in CatManga chapters
      const chapters = await CatManga.getLatestChapters();
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
    return CatManga.parseMangaLink(uri);
  }

  public uriForId(id: string): string {
    return CatManga.toMangaUrl(id);
  }

  timerTask = async (): Promise<void> => {
    this.logger.debug('Running CatManga scraper');

    try {
      // Fetch chapters sorted by latest
      const latestChapters = await CatManga.getLatestChapters();

      // Reverse the order of the chapters to go from earliest to latest
      latestChapters.reverse().forEach(async c => {
        // Ignore chapters we've already seen
        if (this.seenUrls.has(c.link)) {
          return;
        }
        this.seenUrls.add(c.link);

        const mangaChapter = new MangaChapter();
        mangaChapter.type = ScraperType.CatManga;
        mangaChapter.link = c.link;
        mangaChapter.titleId = c.seriesId;
        mangaChapter.chapter = c.chapterNumber?.toString();
        mangaChapter.pageCount = null;

        this.logger.debug(`New CatManga item: ${c.seriesTitle} | ${c.chapterNumber}`);
        NewCatMangaItemTopic.notify(mangaChapter);
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export const CatMangaScraper = new CatMangaScraperImpl();