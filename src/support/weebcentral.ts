import { CloudflareBypass, Logger } from "bot-framework";
import { JSDOM } from "jsdom";

import { ScraperType } from "../constants/scraper_types.js";
import { Subscribable } from "../models/Subscribable.js";
import { Store } from "./store.js";
import { ScraperHelper } from "./scrapers.js";

const WEEBCENTRAL_URL = "https://weebcentral.com/latest-updates/1";

const WEEBCENTRAL_SERIES_RX = /https?:\/\/weebcentral.com\/series\/([^/]+)/;

export class WeebCentralChapter {
  seriesId: string;
  seriesName: string
  chapter: string;
  link: string;
  date: Date;
}

export class WeebCentralManga implements Subscribable {
  id: string;
  title: string;
  type = ScraperType.WeebCentral;
}

export class WeebCentral {
  
  private static logger: Logger = new Logger("WeebCentral");
  
  public static async getLatestChapters(fromDate?: Date): Promise<WeebCentralChapter[]> {
    // Get SSR latest updates page 1
    let data: string = null;
    try {
      data = await CloudflareBypass.fetch(WEEBCENTRAL_URL);
    } catch(e) {
      // Log the error to debug and update the scraper staus
      this.logger.error('Fetch failed for Weeb Central');
      this.logger.debug(e);
      ScraperHelper.getScraperForType(ScraperType.WeebCentral).setStatus(false);
      return null;
    }

    // Parse HTML to a JSDOM object
    const pageDom = new JSDOM(data);

    // Get all the articles on the page
    const articleNodes = pageDom.window.document.querySelectorAll('article');
    if (articleNodes.length == 0) {
      this.logger.error('No chapters found');
      // Log the error to debug and update the scraper staus
      ScraperHelper.getScraperForType(ScraperType.WeebCentral).setStatus(false);
      return null;
    }

    // Loop over all the article nodes and generate chapters
    const latestChapters: WeebCentralChapter[] = [];
    for (const articleNode of articleNodes) {
      const chapter = new WeebCentralChapter();

      try {
        /*
          Article node has the following structure:

          article:
            a href=<series url>
              picture - cover image
            a href=<chapter url>
              div
                span class="font-semibold text-lg" - series title
              div
                span - chapter name
              div
                time datetime=<ISO datetime> - publication date
        */

        const chapterNode = articleNode.querySelector('a:nth-of-type(2)');

        chapter.link = chapterNode.getAttribute('href');
        const chapterText = chapterNode.querySelector('div:nth-of-type(2) > span').textContent.trim();
        chapter.chapter = WeebCentral.parseChapterNumber(chapterText);
        
        chapter.seriesName = chapterNode.querySelector('span.font-semibold.text-lg').textContent.trim();
        const mangaLink = articleNode.querySelector('a:nth-of-type(1)').getAttribute('href');
        chapter.seriesId = WeebCentral.parseIdFromSeriesLink(mangaLink);

        const publishDateText = chapterNode.querySelector('time').getAttribute('datetime');
        chapter.date = new Date(publishDateText);

        // If we have a date filter and this chapter is before that date, break here
        if (fromDate != null && chapter.date < fromDate) {
          break;
        }

        latestChapters.push(chapter);
      } catch (e) {
        this.logger.error(`Could not parse a chapter: ${chapter.link}`);
      }
    }

    // Since we've succeeded in fetching data, set the scraper status to up
    ScraperHelper.getScraperForType(ScraperType.WeebCentral).setStatus(true);
    return latestChapters;
  }

  public static async parseWeebCentralMangaLink(uri: string): Promise<WeebCentralManga> {
    // Test to see if URL format matches
    const uri_match = uri.match(WEEBCENTRAL_SERIES_RX);
    if (uri_match == null) {
      return null;
    }

    const id = uri_match[1];
    let title = await Store.getTitleName(ScraperType.WeebCentral, id);
    if (title == null) {
      const matches = await CloudflareBypass.fetchElementTextMatches(uri, 'h1');
      // If there is no title, this is likely an invalid link
      if (matches.length == 0) {
        return null;
      }

      title = matches[0];
    }

    const manga = new WeebCentralManga();
    manga.id = id;
    manga.title = title;
    return manga;
  }

  public static toMangaUrl(id: string): string {
    return `https://weebcentral.com/series/${id}/`;
  }
  
  private static parseChapterNumber(chapterText: string): string {
    const matches = chapterText.match(/\d+/);
    return matches ? matches[0] : chapterText;
  }

  private static parseIdFromSeriesLink(seriesLink: string): string {
    const matches = seriesLink.match(WEEBCENTRAL_SERIES_RX);
    return matches?.[1];
  }
}