import { ScraperType } from "../constants/scraper_types.js";

export class MangaChapter {
  // Unique identifier for the manga
  titleId: string;
  // Type of scraper which scraped the manga
  type: ScraperType
  // URI to the chapter
  link: string;
  // Chapter number of the chapter
  chapter: string;
  // Page count of the chapter
  pageCount: number;
}