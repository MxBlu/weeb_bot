import { Chapter } from "mangadex-full-api";
import { ScraperType } from "../constants/scraper_types.js";

import { MangadexPulseTopic, NewMangadexItemTopic } from "../constants/topics.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { MangadexHelper, MangadexHelperDependency } from "../support/mangadex.js";

export class MangadexScraperImpl extends BaseScraper {

  // Sets of seen chapters
  guidSet: Set<string>;
  // Date when scraping began
  startDate: Date;

  constructor() {
    super(ScraperType.Mangadex);
    this.guidSet = new Set();
    this.startDate = null;
  }

  public async init(): Promise<void> {
    // Wait for MangadexHelper to be ready
    await MangadexHelperDependency.await();
    
    // Run superclass init functions
    await super.init();
  }

  public async enable(): Promise<boolean> {
    // Enable parser, and set start date if successful
    if (await super.enable()) {
      this.startDate = new Date();
    }
    return false;
  }
  
  public async disable(): Promise<boolean> {
    return super.disable();
  }
  
  public async parseItemFromUri(uri: string): Promise<Subscribable> {
    return MangadexHelper.parseTitleUrlToMangaLite(uri);
  }

  public uriForId(id: string): string {
    return MangadexHelper.toTitleUrl(id);
  }

  timerTask = async (): Promise<void> => {
    try {
      // Only get chapters since we started scraping
      let startDateStr = this.startDate.toISOString();
      // Since it wants ISO but without the milliseconds or Z
      startDateStr = startDateStr.substring(0, startDateStr.length - 5);

      // Get chapters since last refresh
      let results = await Chapter.search({
        limit: 100,
        publishAtSince: startDateStr,
        includeFuturePublishAt: 0,
        order: {updatedAt: 'desc'},
        translatedLanguage: [ 'en' ]
      });

      // https://github.com/md-y/mangadex-full-api/issues/51
      // Chapters can be null if the API is busted, ignore these
      results = results.filter(c => c.id != null);

      // Filter out any chapters we've seen already
      results = results.filter(c => !this.guidSet.has(c.id));
      // For every result, notify 
      // Iterate backwards to go from earliest to latest
      for (const chapter of results.reverse()) {
        this.guidSet.add(chapter.id);

        const mChapter = new MangaChapter();
        mChapter.type = ScraperType.Mangadex;
        mChapter.link = MangadexHelper.toChapterUrl(chapter.id);
        mChapter.titleId = chapter.manga.id;
        mChapter.chapter = chapter.chapter;
        mChapter.pageCount = chapter.pages;

        this.logger.debug(`New Mangadex item: ${mChapter.titleId} | ${mChapter.chapter}`);
        NewMangadexItemTopic.notify(mChapter);
      }

      // Notify the pulse topic that Mangadex is alive
      MangadexPulseTopic.notify({
        status: true,
        lastUp: new Date(),
        lastDown: MangadexPulseTopic.lastData?.lastDown
      });
    } catch (e) {
      // If we encounter an error, the API is probably problematic
      // Notify the pulse topic with an error
      MangadexPulseTopic.notify({
        status: false,
        lastUp: MangadexPulseTopic.lastData?.lastUp,
        lastDown: new Date()
      });
      this.logger.error(e);
    }
  }
}

export const MangadexScraper = new MangadexScraperImpl();