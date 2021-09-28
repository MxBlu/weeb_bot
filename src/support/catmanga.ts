import { CloudflareBypass } from "bot-framework";
import { ScraperType } from "../constants/scraper_types.js";

import { Subscribable } from "../models/Subscribable.js";
import { Store } from "./store.js";

// CatManga homepage URL
const CATMANGA_URL = "https://catmanga.org/";
// CatManga series URL format
const CATMANGA_MANGA_RX = /https?:\/\/catmanga\.org\/series\/([^/]+)\/?$/;

// A whole bunch of interfaces for interpretting the __NEXT_DATA__ object

interface CoverArt {
  source: string;
  width: number;
  height: number;
}

interface MangaSeries {
  alt_titles: string[];
  authors: string[];
  genres: string[];
  chapters: MangaChapter[];
  title: string;
  series_id: string;
  description: string;
  status: string;
  cover_art: CoverArt;
  all_covers: CoverArt[];
}

interface MangaChapter {
  title: string;
  groups: string[];
  number: number;
  volume: number;
  display_number: string;
}

interface LatestChapter {
  series_id: string;
  number: number;
}

interface LatestUpdates {
  popular: string[];
  latest: LatestChapter[];
  featured: string[];
}

interface HomePageProps {
  series: MangaSeries[];
  latestUpdates: LatestUpdates;
}

interface SeriesPageProps {
  series: MangaSeries;
}

// Chapter and Manga objects to use for parsing

export class CatMangaChapter {
  seriesId: string;
  seriesTitle: string
  status: string;
  chapterNumber: number;
  link: string;
  genres: string[];
}

export class CatMangaManga implements Subscribable {
  id: string;
  title: string;
  type = ScraperType.CatManga;
}

export class CatManga {
  // Get chapters on CatManga, sorted by date order
  // WARNING: Date is not available on the website, so relative order is all we got to work with
  public static async getLatestChapters(): Promise<CatMangaChapter[]> {
    // Get __NEXT_DATA__ value on CatManga homepage
    let data: string = null;
    try {
      const dataArray = await CloudflareBypass.fetchElementTextMatches(CATMANGA_URL, "#__NEXT_DATA__");
      if (dataArray.length != 1) {
        throw `Invalid amount of elements with id '__NEXT_DATA__'`
      }

      data = dataArray[0];
    } catch(e) {
      throw `MangaseeException: CloudFlareBypass encountered an error: ${e}`;
    }

    // Extract "latests" array from __NEXT_DATA__
    let latests: LatestChapter[] = null;
    const seriesMap = new Map<string, MangaSeries>();
    try {
      const props: HomePageProps = JSON.parse(data).props.pageProps;
      
      // Generate a map of series IDs to the MangaSeries objects
      props.series.forEach(s => {
        seriesMap.set(s.series_id, s);
      });
      
      latests = props.latestUpdates.latest;
    } catch(e) {
      throw `CatMangaException: Unable to decipher __NEXT_DATA__`;
    }

    // Map raw series and chapters to CatMangaChapters
    const latestChapters = latests.map(latest => {
      // Fetch series object from generated
      const series = seriesMap.get(latest.series_id);

      const chapter = new CatMangaChapter();
      chapter.seriesId = series.series_id;
      chapter.seriesTitle = series.title;
      chapter.status = series.status;
      chapter.genres = series.genres;
      chapter.chapterNumber = latest.number;
      chapter.link = this.getChapterLink(series, latest.number);
      return chapter;
    });

    return latestChapters;
  }

  public static async parseMangaLink(uri: string): Promise<CatMangaManga> {
    // Test to see if URL format matches
    const uri_match = uri.match(CATMANGA_MANGA_RX);
    if (uri_match == null) {
      return null;
    }

    const id = uri_match[1];
    // Fetch title from Store, or from uri if not present in Store
    let title = await Store.getTitleName(ScraperType.CatManga, id);
    if (title == null) {
      // Get __NEXT_DATA__ value on series page
      let data: string = null;
      try {
        const dataArray = await CloudflareBypass.fetchElementTextMatches(uri, "#__NEXT_DATA__");
        if (dataArray.length != 1) {
          throw `Invalid amount of elements with id '__NEXT_DATA__'`
        }
  
        data = dataArray[0];
      } catch(e) {
        // If we have any kind of issue getting the data, assume this uri is not a valid series link
        return null;
      }

      // Pull out the series from the data
      let series: MangaSeries = null;
      try {
        const props: SeriesPageProps = JSON.parse(data).props.pageProps;
        series = props.series;
      } catch(e) {
        throw `CatMangaException: Unable to decipher __NEXT_DATA__`;
      }

      title = series.title;
    }

    const manga = new CatMangaManga();
    manga.id = id;
    manga.title = title;
    return manga;
  }

  public static toMangaUrl(id: string): string {
    return `https://catmanga.org/series/${id}`;
  }

  private static getChapterLink(series: MangaSeries, chapter: number): string {
    return `https://catmanga.org/series/${series.series_id}/${chapter}`;
  }
}