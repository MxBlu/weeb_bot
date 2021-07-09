import { CloudflareBypass } from "../framework/cloudflare_bypass.js";

const MANGASEE_URL = "https://mangasee123.com";

class MangaseeChapterRaw {
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

export class Mangasee {
  public static async getLatestChapters(fromDate: Date): Promise<MangaseeChapter[]> {
    // Get title page
    let data = null;
    try {
      data = await CloudflareBypass.fetch(MANGASEE_URL);
    } catch(e) {
      throw `HTTPException: ${e}`;
    }

    // Extract LatestJSON variable, containing new chapters
    const json_match = data.match(/vm\.LatestJSON = (\[.+?\]);/);
    const latestChaptersRaw: MangaseeChapterRaw[] = JSON.parse(json_match[1]);

    // Optionally filter it down to the be from a given date
    if (fromDate == null) {
      // Convert date strings to Date objects and add extra data
      //  (Chapter number, link)
      const latestChapters: MangaseeChapter[] = latestChaptersRaw.map(raw => {
        const chapter = new MangaseeChapter();
        chapter.chapterNumber = this.getChapterNumber(raw.Chapter);
        chapter.date = new Date(raw.Date);
        chapter.genres = raw.Genres.split(", ");
        chapter.link = this.createMangaseeLink(raw);
        chapter.scanStatus = raw.ScanStatus;
        chapter.seriesId = raw.SeriesID;
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
        chapter.link = this.createMangaseeLink(raw);
        chapter.scanStatus = raw.ScanStatus;
        chapter.seriesId = raw.SeriesID;
        chapter.seriesName = raw.SeriesName;
        latestChapters.push(chapter);
      }
      return latestChapters;
    }
  }

  // Create a link to a given chapter
  private static createMangaseeLink(seriesChapter: MangaseeChapterRaw): string {
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
  private static getChapterNumber(ChapterString: string) {
    return Number(ChapterString.slice(1,-1));
  }
}