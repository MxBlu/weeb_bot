import * as Mangadex from 'mangadex-full-api';
import { Logger } from './logger.js';
import { Store } from './store.js';

// Regex for matching Mangadex urls
const mangadexTitleSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/title\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;
const mangadexChapterSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/chapter\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;

export class MangaLite {
  id: string;
  title: string;
}

class MangadexHelperImpl {
  logger: Logger;

  constructor() {
    this.logger = new Logger("MangadexHelper");
  }

  public async init(username: string, password: string): Promise<void> {
    await Mangadex.login(username, password);
    this.logger.info("Mangadex API logged in");
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
  public async parseTitleUrlToMangaLite(url: string): Promise<MangaLite | Mangadex.Manga> {
    const id = this.parseTitleUrl(url);

    try {
      return await Mangadex.Manga.get(id);
    } catch (e) {
      if (!(e instanceof APIRequestError)) {
        // If it's not an API error, might be something worth throwing
        throw e;
      }
    }
    
    const title = await Store.getTitleName(id);
    if (title == null) {
      return null;
    }

    const mangalite = new MangaLite();
    mangalite.id = id;
    mangalite.title = await Store.getTitleName(id);
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