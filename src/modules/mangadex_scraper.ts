import { Chapter } from "mangadex-full-api";
import { MANGADEX_FEED_REFRESH_INTERVAL } from "../constants/constants.js";
import { MangaChapter } from "../model/MangaChapter.js";
import { MessengerTopic } from "../util/imm.js";
import { Logger } from "../util/logger.js";
import { MangadexHelper } from "../util/mangadex.js";

export class MangadexScraperImpl {

  logger: Logger;
  // Sets of seen chapters
  guidSet: Set<string>;

  constructor() {
    this.guidSet = new Set();
    this.logger = new Logger("MangadexScraper");
  }

  public init(): void {
    if (isNaN(MANGADEX_FEED_REFRESH_INTERVAL)) {
      this.logger.error("Invalid refresh interval for Mangadex");
      return;
    }
    
    // Run timerTask at regular intervals 
    setInterval(this.timerTask, MANGADEX_FEED_REFRESH_INTERVAL);
  }

  private timerTask = async (): Promise<void> => {
    try {
      // Calculate the time of refresh 2 cycles ago
      // Gives leeway for request issues
      const lastIntervalTime = new Date(Date.now() - MANGADEX_FEED_REFRESH_INTERVAL * 2);
      const lastIntervalStr = lastIntervalTime.toISOString();

      // Get chapters since last refresh
      let results = await Chapter.search({
        limit: 100,
        publishAtSince: lastIntervalStr.substring(0, lastIntervalStr.length - 5), // Since it wants ISO but without the milliseconds or Z
        order: {updatedAt: 'desc'},
        translatedLanguage: [ 'en' ]
      });

      // Filter out any chapters we've seen already
      results = results.filter(c => this.guidSet.has(c.id));
      // For every result, notify 
      for (const chapter of results) {
        this.guidSet.add(chapter.id);

        const mChapter = new MangaChapter();
        mChapter.link = MangadexHelper.toChapterUrl(chapter.id);
        mChapter.titleId = chapter.manga.id;
        mChapter.chapterNumber = chapter.chapter;
        mChapter.pageCount = chapter.pageNames?.length;

        this.logger.info(`New Mangadex item: ${mChapter.titleId} | ${mChapter.chapterNumber}`, 3);
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

class MangadexPulse {
  status: boolean;
  lastUp: Date;
  lastDown: Date;
}

export const MangadexPulseTopic = new MessengerTopic<MangadexPulse>("MangadexPulseTopic");

export const NewMangadexItemTopic = new MessengerTopic<MangaChapter>("NewMangadexItemTopic");