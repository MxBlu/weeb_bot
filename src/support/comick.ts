import { Logger } from "bot-framework";
import { ScraperType } from "../constants/scraper_types.js";
import { Subscribable } from "../models/Subscribable.js";
import { ScraperHelper } from "./scrapers.js";
import { Store } from "./store.js";

const COMICK_LATEST_ENDPOINT = "https://api.comick.fun/chapter/";
const COMICK_COMIC_ENDPOINT = "https://api.comick.fun/comic";
const COMICK_BASE_URL = "https://comick.io";
const COMICK_MANGA_RX = /https?:\/\/comick.io\/comic\/([^/]+)/;

export class ComickManga implements Subscribable {
  id: string;
  title: string;
  type = ScraperType.Comick;
}

export class ComickChapter {
  hid: string;
  seriesTitle: string;
  seriesSlug: string;
  chap: string;
  link: string;
  publish_at: Date;
}

interface ComickLatestChapter {
  id: number;
  status: string;
  chap: string;
  vol: null | string;
  last_at: string | null;
  hid: string;
  created_at: string;
  group_name: string[] | null;
  updated_at: string;
  up_count: number;
  lang: string;
  down_count: number;
  external_type: null | string;
  publish_at: string;
  md_comics: {
    id: number;
    hid: string;
    title: string;
    slug: string;
    content_rating: "erotica" | "safe" | "suggestive";
    country: string;
    status: number;
    translation_completed: boolean | null;
    last_chapter: number;
    final_chapter: null | string;
    created_at: string;
    genres: number[];
    demographic: number | null;
    is_english_title: boolean | null;
    md_titles: {
      title: string;
      lang: string;
    }[];
    md_covers: {
      w: number;
      h: number;
      b2key: string;
    }[];
    cover_url: string;
  };
  count: number;
}

export interface ComickComicData {
  firstChap: {
    chap: string;
    hid: string;
    lang: string;
    group_name: string[];
    vol: null;
  };
  comic: {
    id: number;
    hid: string;
    title: string;
    country: string;
    status: number;
    links: {
      al: string;
      ap: string;
      bw: string;
      kt: string;
      mu: string;
      amz: string;
      cdj: string;
      ebj: string;
      mal: string;
      raw: string;
      engtl: string;
    };
    last_chapter: number;
    chapter_count: number;
    demographic: number;
    user_follow_count: number;
    follow_rank: number;
    follow_count: number;
    desc: string;
    parsed: string;
    slug: string;
    mismatch: null;
    year: number;
    bayesian_rating: string;
    rating_count: number;
    content_rating: string;
    translation_completed: boolean;
    chapter_numbers_reset_on_new_volume_manual: boolean;
    final_chapter: string;
    final_volume: string;
    noindex: boolean;
    adsense: boolean;
    login_required: boolean;
    recommendations: {
      up: number;
      down: number;
      total: number;
      relates: {
        title: string;
        slug: string;
        hid: string;
        md_covers: {
          vol: null | string;
          w: number;
          h: number;
          b2key: string;
        }[];
      };
    }[];
    relate_from: {
      relate_to: {
        title: string;
        slug: string;
      };
      md_relates: {
        name: string
      };
    }[];
    md_titles: {
      title: string;
      lang: null | string;
    }[];
    is_english_title: null;
    md_comic_md_genres: {
      md_genres: {
        name: string;
        type: string;
        slug: string;
        group: string;
      }
    }[];
    md_covers: {
      vol: null | string;
      w: number;
      h: number;
      b2key: string;
    }[];
    mu_comics: {
      mu_comic_publishers: {
        mu_publishers: {
          title: string;
          slug: string;
        };
      }[];
      licensed_in_english: boolean;
      mu_comic_categories: {
        mu_categories: {
          title: string;
          slug: string;
        };
        positive_vote: number;
        negative_vote: number;
      }[];
    };
    iso639_1: string;
    lang_name: string;
    lang_native: string;
    cover_url: string;
  };
  artists: {
    name: string;
    slug: string;
  }[];
  authors: {
    name: string;
    slug: string;
  }[];
  langList: string[];
  recommendable: boolean;
  demographic: string;
  englishLink: null;
  matureContent: boolean;
  checkVol2Chap1: boolean;
} 

export class Comick {
  
  private static logger: Logger = new Logger("Comick");
  
  public static async getLatestChapters(fromDate?: Date): Promise<ComickChapter[]> {
    // Get 2 pages worth of chapters from Comick
    const rawChapters: ComickLatestChapter[] = [];
    for (let i = 1; i <= 2; i++) {
      // Construct the request URL
      const latestUrl = new URL(COMICK_LATEST_ENDPOINT);
      latestUrl.searchParams.set("page", i.toString());
      latestUrl.searchParams.set("lang", "en");
      latestUrl.searchParams.set("order", "new");
      latestUrl.searchParams.set("tachiyomi", "true");
      latestUrl.searchParams.set("accept_erotic_content", "true");

      // Get a page
      try {
        const resp = await fetch(latestUrl.toString());
        rawChapters.push(...await resp.json());
      } catch(e) {
        // Log the error to debug and update the scraper staus
        this.logger.error(`Error fetching page ${i} for Comick`);
        this.logger.debug(e);
        ScraperHelper.getScraperForType(ScraperType.Comick).setStatus(false);
        return null;
      }
    }

    let latestChapters: ComickChapter[] = rawChapters.map(raw => ({
        chap: raw.chap,
        hid: raw.hid,
        publish_at: new Date(raw.publish_at),
        seriesSlug: raw.md_comics.slug,
        seriesTitle: raw.md_comics.title,
        link: this.createComickChapterLink(raw)
      }));

    // Optionally filter it down to the be from a given date
    if (fromDate != null) {
      // Filter out chapters with a published_at before the given date
      latestChapters = latestChapters.filter(chapter => chapter.publish_at > fromDate);
    }
    
    // Since we've succeeded in fetching data, set the scraper status to up
    ScraperHelper.getScraperForType(ScraperType.Comick).setStatus(true);
    return latestChapters;
  }

  public static async parseComickMangaLink(uri: string): Promise<ComickManga> {
    // Test to see if URL format matches
    const uri_match = uri.match(COMICK_MANGA_RX);
    if (uri_match == null) {
      return null;
    }

    const slug = uri_match[1];
    let title = await Store.getTitleName(ScraperType.Comick, slug);
    if (title == null) {
      // TODO - get title
      const endpoint = new URL(`${COMICK_COMIC_ENDPOINT}/${slug}/`);
      endpoint.searchParams.set("tachiyomi", "true");
      
      try {
        const resp = await fetch(endpoint.toString());
        const comicData: ComickComicData = await resp.json();

        title = comicData.comic.title;
      } catch(e) {
        // Log the error to debug and update the scraper staus
        this.logger.error(`Error fetching slug '${slug}' for Comick`);
        this.logger.debug(e);
        return null;
      }
    }

    return {
      id: slug,
      title: title,
      type: ScraperType.Comick
    };
  }

  public static toMangaUrl(slug: string): string {
    return `${COMICK_BASE_URL}/comic/${slug}`;
  }

  // Create a link to a given chapter
  private static createComickChapterLink(chapter: ComickLatestChapter): string {
    return `${COMICK_BASE_URL}/comic/${chapter.md_comics.slug}/${chapter.hid}-chapter-${chapter.chap}-${chapter.lang}`;
  }
}