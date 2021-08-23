import { CloudflareBypass } from "bot-framework";

import { ScraperType } from "../constants/scraper_types.js";
import { Subscribable } from "../models/Subscribable.js";
import { Store } from "./store.js";

const MANGASEE_URL = "https://mangasee123.com";
const MANGASEE_TITLE_CSS = '.MainContainer h1';
const MANGASEE_MANGA_RX = /https?:\/\/mangasee123.com\/manga\/([^/]+)/;

interface MangaseeChapterRaw {
  SeriesID: string;
  IndexName: string;
  SeriesName: string
  ScanStatus: string;
  Chapter: string;
  Genres: string;
  Date: string;
  IsEdd: boolean;
}

export class MangaseeChapter {
  seriesId: string;
  seriesName: string
  scanStatus: string;
  chapterNumber: number;
  link: string;
  genres: string[];
  date: Date;
}

export class MangaseeManga implements Subscribable {
  id: string;
  title: string;
  type = ScraperType.Mangasee;
}

export class Mangasee {
  public static async getLatestChapters(fromDate: Date): Promise<MangaseeChapter[]> {
    // Get title page
    let data: string = null;
    try {
      data = await CloudflareBypass.fetch(MANGASEE_URL);
    } catch(e) {
      throw `MangaseeException: CloudFlareBypass encountered an error: ${e}`;
    }

    // Extract LatestJSON variable, containing new chapters
    let json_match = null;
    let latestChaptersRaw: MangaseeChapterRaw[] = null;
    try {
      json_match = data.match(/vm\.LatestJSON = (\[.+?\]);/);
      latestChaptersRaw = JSON.parse(json_match[1]);
    } catch(e) {
      throw `MangaseeException: Unable to find JSON in body`;
    }

    // Optionally filter it down to the be from a given date
    if (fromDate == null) {
      // Convert date strings to Date objects and add extra data
      //  (Chapter number, link)
      const latestChapters: MangaseeChapter[] = latestChaptersRaw.map(raw => {
        const chapter = new MangaseeChapter();
        chapter.chapterNumber = this.getChapterNumber(raw.Chapter);
        chapter.date = new Date(raw.Date);
        chapter.genres = raw.Genres.split(", ");
        chapter.link = this.createMangaseeChapterLink(raw);
        chapter.scanStatus = raw.ScanStatus;
        chapter.seriesId = raw.IndexName; // Better ID than SeriesID
        chapter.seriesName = raw.SeriesName;
        return chapter;
      });
      return latestChapters;
    } else {
      // Assumes latestChapters is already sorted
      // Find the index of first date past our desired, then slice the array

      // Change the date strings to Date objects as we go
      // Might as well set the Link url and chapter number here too
      const latestChapters: MangaseeChapter[] = [];

      for (const raw of latestChaptersRaw) {
        // Parse the date of the raw chapter
        const chapter = new MangaseeChapter();
        chapter.date = new Date(raw.Date);

        // If earlier than our threshold, stop;
        if (chapter.date < fromDate) {
          break;
        }

        // Otherwise, parse the rest of the chapter and push to array
        chapter.chapterNumber = this.getChapterNumber(raw.Chapter);
        chapter.genres = raw.Genres.split(", ");
        chapter.link = this.createMangaseeChapterLink(raw);
        chapter.scanStatus = raw.ScanStatus;
        chapter.seriesId = raw.IndexName; // Better ID than SeriesID
        chapter.seriesName = raw.SeriesName;
        latestChapters.push(chapter);
      }
      return latestChapters;
    }
  }

  public static async parseMangaseeMangaLink(uri: string): Promise<MangaseeManga> {
    // Test to see if URL format matches
    const uri_match = uri.match(MANGASEE_MANGA_RX);
    if (uri_match == null) {
      return null;
    }

    const id = uri_match[1];
    let title = await Store.getTitleName(ScraperType.Mangasee, id);
    if (title == null) {
      const matches = await CloudflareBypass.fetchElementTextMatches(uri, MANGASEE_TITLE_CSS);
      // If there is no title, this is likely an invalid link
      if (matches.length == 0) {
        return null;
      }

      title = matches[0];
    }

    const manga = new MangaseeManga();
    manga.id = id;
    manga.title = title;
    return manga;
  }

  public static toMangaUrl(id: string): string {
    return `https://mangasee123.com/manga/${id}/`;
  }

  // Create a link to a given chapter
  private static createMangaseeChapterLink(seriesChapter: MangaseeChapterRaw): string {
    return `${MANGASEE_URL}/read-online/${seriesChapter.IndexName}${this.ChapterURLEncode(seriesChapter.Chapter)}-page-1.html`;
  }
  
  // Copied from Mangasee index.html
  private static ChapterURLEncode(ChapterString: string): string {
    let Index = "";
    const IndexString = ChapterString.substring(0, 1);
    if(IndexString != '1'){
      Index = "-index-" + IndexString;
    }
  
    const Chapter = Number(ChapterString.slice(1,-1));
  
    let Odd = "";
    const OddString = ChapterString[ChapterString.length -1];
    if(OddString != '0'){
      Odd = "." + OddString;
    }
    
    return "-chapter-" + Chapter + Odd + Index;
  }

  // Dervied from ChapterURLEncode
  private static getChapterNumber(ChapterString: string): number {
    return Number(ChapterString.slice(1,-1));
  }
}