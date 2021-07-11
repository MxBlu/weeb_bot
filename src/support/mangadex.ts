import { Dependency, Logger } from 'bot-framework';
import * as Mangadex from 'mangadex-full-api';

import { MANGADEX_CACHE_LOCATION } from '../constants/constants.js';
import { ScraperType } from '../constants/scraper_types.js';
import { Subscribable } from '../models/Subscribable.js';
import { Store } from './store.js';

// Regex for matching Mangadex urls
const mangadexTitleSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/title\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;
const mangadexChapterSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/chapter\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;

export class MangaLite implements Subscribable {
  id: string;
  title: string;
  type = ScraperType.Mangadex;
}

class MangadexHelperImpl {
  logger: Logger;

  constructor() {
    this.logger = new Logger("MangadexHelper");
  }

  public async init(username: string, password: string): Promise<void> {
    await Mangadex.login(username, password, MANGADEX_CACHE_LOCATION);
    this.logger.info("Mangadex API logged in");
    MangadexHelperDependency.ready();
  }

  // Extract id out of a Mangadex title url
  // Returns null if invalid
  public parseTitleUrl(url: string): string {
    const matchObj = url.match(mangadexTitleSyntax);
    if (matchObj == null || matchObj[1].length == 0) {
      return null;
    }
    return matchObj[1];
  }

  // Extract id out of a Mangadex title url and return the best manga object we can
  // Returns null if invalid
  public async parseTitleUrlToMangaLite(url: string): Promise<MangaLite> {
    const id = this.parseTitleUrl(url);

    // If the url was not a Mangadex URL, exit early
    if (id == null) {
      return null;
    }

    // Try requesting from the Mangadex API
    try {
      const manga = await Mangadex.Manga.get(id);
      const mangalite = new MangaLite();
      mangalite.id = id;
      mangalite.title = manga.title;
      return mangalite;
    } catch (e) {
      if (!(e instanceof APIRequestError)) {
        // If it's not an API error, might be something worth throwing
        throw e;
      }
    }
    
    // See if a Mangadex title was ever available for this id
    const title = await Store.getTitleName(ScraperType.Mangadex, id);
    // If not, this URI can't be determined to be a support Mangadex one
    if (title == null) {
      return null;
    }

    // If we do have a title, it's been parsed in the past
    const mangalite = new MangaLite();
    mangalite.id = id;
    mangalite.title = title;
    return mangalite;
  }

  // Extract id out of a Mangadex chapter url
  // Returns null if invalid
  public parseChapterUrl(url: string): string {
    const matchObj = url.match(mangadexChapterSyntax);
    if (matchObj == null || matchObj[1].length == 0) {
      return null;
    }
    return matchObj[1];
  }

  // Use API to get title of a manga, given id
  // Return null if the title could not be found
  public async getMangaTitle(titleId: string): Promise<string> {
    let manga: Mangadex.Manga = null;
    try {
      manga = await Mangadex.Manga.get(titleId);
    } catch (e) {
      // API Request error = oh no couldn't find it
      // Just reutn null
      if (e instanceof APIRequestError) {
        return null;
      } else {
        throw e;
      }
    }
    return manga.title;
  }

  // Use API to get page count of a chapter, given id
  // Will throw an exception if API returns an invalid response
  public async getChapterPageCount(chapterId: string): Promise<number> {
    let chapter: Mangadex.Chapter = null;
    try {
      chapter = await Mangadex.Chapter.get(chapterId);
    } catch (e) {
      if (e instanceof APIRequestError) {
        return null;
      } else {
        throw e;
      }
    }
    return chapter.pageNames.length;
  }

  // Returns a manga url given an id 
  public toTitleUrl(titleId: string) {
    return `https://mangadex.org/title/${titleId}/`;
  }

  // Returns a chapter url given an id 
  public toChapterUrl(chapterId: string) {
    return `https://mangadex.org/chapter/${chapterId}/`;
  }

  public async converyLegacyId(...ids: number[]): Promise<string[]> {
    return Mangadex.convertLegacyId("manga", ids);
  }

}

export const MangadexHelper = new MangadexHelperImpl();

export const MangadexHelperDependency = new Dependency("MangadexHelper");