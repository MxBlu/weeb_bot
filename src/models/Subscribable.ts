import { ScraperType } from "../constants/scraper_types.js";

export interface Subscribable {
  // Unique identifier for item
  id: string;
  // Friendly title for item
  title: string;
  // Scraper type to handle this
  type: ScraperType;
}