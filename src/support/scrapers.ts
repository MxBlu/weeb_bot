import { IScraper } from "./base_scraper.js";
import { ScraperType } from "../constants/scraper_types.js";
import { Subscribable } from "../models/Subscribable.js";

export class ScraperHelperImpl {
  // Lookup of scrapers by type
  lookup: Map<ScraperType, IScraper>;

  constructor() {
    this.lookup = new Map();
  }

  // Add scraper to lookup
  public registerScraper(scraper: IScraper, type: ScraperType): void {
    if (this.lookup.has(type)) {
      throw new Error(`Scraper lookup already has type '${type}' defined`);
    }

    this.lookup.set(type, scraper);
  }
  
  // Get the scraper for a given type
  public getScraperForType(type: ScraperType): IScraper {
    return this.lookup.get(type);
  }

  // Parse a URI and return a Subscribable object
  public async parseUri(uri: string): Promise<Subscribable> {
    // For each registered scraper, attempt to parse the URI
    // If successful (non-null), return the Subscribable parsed
    // Else return null;
    for (const scraper of this.lookup.values()) {
      const subscribable = await scraper.parseItemFromUri(uri);
      if (subscribable != null) {
        return subscribable;
      } 
    }

    return null;
  }
}

export const ScraperHelper = new ScraperHelperImpl();