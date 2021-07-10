import { MangadexScraper } from "../modules/mangadex_scraper.js";
import { MangaseeScraper } from "../modules/mangasee_scraper.js";
import { IScraper } from "../support/base_scraper.js";
import { ScraperType } from "./scraper_enums.js";

// Lookup of all the scraper types to the corresponding scraper
const ScraperLookup = new Map<ScraperType, IScraper>([
  [ScraperType.Mangadex, MangadexScraper],
  [ScraperType.Mangasee, MangaseeScraper]
]);

// Get the scraper for a given ScraperType enum
export const getScraperForType = (type: ScraperType): IScraper => {
  return ScraperLookup.get(type);
}