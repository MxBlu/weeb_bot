import { Chapter } from "mangadex-full-api";
import { MANGADEX_FEED_REFRESH_INTERVAL } from "../constants/constants.js";
import { MangadexPulseTopic, NewMangadexItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Logger } from "../framework/logger.js";
import { MangadexHelper, MangadexHelperDependency } from "../support/mangadex.js";
import { Store } from "../support/store.js";

export class MangadexScraperImpl {

  logger: Logger;
  // Sets of seen chapters
  guidSet: Set<string>;
  // Inverval handle for timer task
  handle: NodeJS.Timeout;
  // Date when scraping began
  startDate: Date;

  constructor() {
    this.guidSet = new Set();
    this.handle = null;
    this.logger = new Logger("MangadexScraper");
  }

  public async init(): Promise<void> {
    await MangadexHelperDependency.await();

    if (isNaN(MANGADEX_FEED_REFRESH_INTERVAL)) {
      this.logger.error("Invalid refresh interval for Mangadex");
      return;
    }
    
    if (await Store.isMangadexEnabled()) {
      // Enable the scraper
      this.enable();
    }
    
  }

  public async enable(): Promise<void> {
    if (this.handle == null) {
      // Run timerTask at regular intervals 
      this.startDate = new Date();
      this.handle = setInterval(this.timerTask, MANGADEX_FEED_REFRESH_INTERVAL);
      // Store setting in DB
      await Store.setMangadexEnabled(true);
      this.logger.info("Mangadex parser enabled");
    }
  }
  
  public async disable(): Promise<void> {
    if (this.handle != null) {
      // Stop timerRask runs
      clearInterval(this.handle);
      this.handle = null;
      // Store setting in DB
      await Store.setMangadexEnabled(false);
      this.logger.info("Mangadex parser disabled");
    }
  }

  private timerTask = async (): Promise<void> => {
    try {
      // Only get chapters since we started scraping
      let startDateStr = this.startDate.toISOString();
      // Since it wants ISO but without the milliseconds or Z
      startDateStr = startDateStr.substring(0, startDateStr.length - 5)

      // Get chapters since last refresh
      let results = await Chapter.search({
        limit: 100,
        publishAtSince: startDateStr, 
        order: {updatedAt: 'desc'},
        translatedLanguage: [ 'en' ]
      });

      // Filter out any chapters we've seen already
      results = results.filter(c => !this.guidSet.has(c.id));
      // For every result, notify 
      for (const chapter of results) {
        this.guidSet.add(chapter.id);

        const mChapter = new MangaChapter();
        mChapter.link = MangadexHelper.toChapterUrl(chapter.id);
        mChapter.titleId = chapter.manga.id;
        mChapter.chapterNumber = chapter.chapter;
        mChapter.pageCount = chapter.pageNames?.length;

        this.logger.debug(`New Mangadex item: ${mChapter.titleId} | ${mChapter.chapterNumber}`);
        NewMangadexItemTopic.notify(mChapter);
      }

      // Notify the pulse topic that Mangadex is alive
      MangadexPulseTopic.notify({
        status: true,
        lastUp: new Date(),
        lastDown: MangadexPulseTopic.getLastData()?.lastDown
      });
    } catch (e) {
      // If we encounter an error, the API is probably problematic
      // Notify the pulse topic with an error
      MangadexPulseTopic.notify({
        status: false,
        lastUp: MangadexPulseTopic.getLastData()?.lastUp,
        lastDown: new Date()
      });
      this.logger.error(e);
    }
  }
}

export const MangadexScraper = new MangadexScraperImpl();