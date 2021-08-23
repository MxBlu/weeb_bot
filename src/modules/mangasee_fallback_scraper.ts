import { ScraperType } from "../constants/scraper_types.js";

import { Subscribable } from "../models/Subscribable.js";
import { BaseScraper } from "../support/base_scraper.js";
import { MangadexHelper } from "../support/mangadex.js";

// Stub scraper implementation, used just so we have a valid scraper type
export class MangaseeFallbackScraperImpl extends BaseScraper {

  constructor() {
    super(ScraperType.MangaseeFallback);
  }

  public async init(): Promise<void> {
    await super.init();
  }

  public async enable(): Promise<boolean> {
    return super.enable();
  }
  
  public async disable(): Promise<boolean> {
    return super.disable();
  }

  public async parseItemFromUri(uri: string): Promise<Subscribable> {
    // Use Mangadex uri parsing since we really just want to use this as fallback
    return MangadexHelper.parseTitleUrlToMangaLite(uri);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public uriForId(id: string): string {
    // There's no Subscribable that implements the MangaseeFallback type 
    throw new Error("Method not implemented.");
  }

  timerTask = async (): Promise<void> => {
    // No OP scraper task - actual scraping is done by MangaseeScraper
    return;
  }
}

export const MangaseeFallbackScraper = new MangaseeFallbackScraperImpl();