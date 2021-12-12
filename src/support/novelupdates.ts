import { CloudflareBypass } from "bot-framework";
import { JSDOM } from 'jsdom';

import { ScraperType } from "../constants/scraper_types.js";
import { Subscribable } from "../models/Subscribable.js";
import { Store } from "./store.js";

// NovelUpdates homepage URL
const NOVELUPDATES_URL = "https://www.novelupdates.com/";
// NovelUpdates series URL format
const NOVELUPDATES_SERIES_RX = /https?:\/\/(?:www\.)?novelupdates\.com\/series\/([^/]+)\/?$/;

// A whole bunch of interfaces for interpretting the __NEXT_DATA__ object

// Chapter and Manga objects to use for parsing

export class NovelUpdatesChapter {
  seriesId: string;
  seriesTitle: string
  releaseTitle: string;
  releaseUrl: string;
  releaseGroup: string;
}

export class NovelUpdatesSeries implements Subscribable {
  id: string;
  title: string;
  type = ScraperType.NovelUpdates;
}

export class NovelUpdates {
  // Get chapters on NovelUpdates, sorted by date order
  // WARNING: Date is not available on the website, so relative order is all we got to work with
  public static async getLatestChapters(): Promise<NovelUpdatesChapter[]> {
    // Get page HTML from NovelUpdates homepage
    let data: string = null;
    try {
     data = await CloudflareBypass.fetch(NOVELUPDATES_URL);
    } catch(e) {
      throw `NovelUpdatesException: CloudFlareBypass encountered an error: ${e}`;
    }

    // Parse HTML and pull out the releases
    const pageDom = new JSDOM(data);
    const latestTableBody = pageDom.window.document.querySelector("#myTable tbody");

    if (latestTableBody == null) {
      throw `NovelUpdatesException: Latest releases table not found`;
    }

    // Iterate through table rows and add "chapters" (really releases, but keeping to the interface I wrote)
    const chapters = [];
    for (let i = 0; i < latestTableBody.children.length; i++) {
      const tr = latestTableBody.children.item(i);
      const chapter = new NovelUpdatesChapter();

      // Get nodes containing useful info
      const titleNode = tr.children.item(0);
      const releaseNode = tr.children.item(1);
      const groupNode = tr.children.item(2);

      // Get series title and ID from the first node
      const titleANode = titleNode.querySelector('a');
      chapter.seriesTitle = titleANode.getAttribute('title');
      const titleMatch = titleANode.href.match(NOVELUPDATES_SERIES_RX);
      chapter.seriesId = titleMatch[1];

      // Get release title and URL from second node
      const releaseANode = releaseNode.querySelector('a');
      chapter.releaseTitle = releaseANode.getAttribute('title');
      chapter.releaseUrl = releaseANode.href;

      // Get group name from third node
      const groupANode = groupNode.querySelector('a');
      chapter.releaseGroup = groupANode.getAttribute('title');
      
      chapters.push(chapter);
    }

    return chapters;
  }

  public static async parseMangaLink(uri: string): Promise<NovelUpdatesSeries> {
    // Test to see if URL format matches
    const uri_match = uri.match(NOVELUPDATES_SERIES_RX);
    if (uri_match == null) {
      return null;
    }

    const id = uri_match[1];
    // // Fetch title from Store, or from uri if not present in Store
    let title = await Store.getTitleName(ScraperType.NovelUpdates, id);
    if (title == null) {
      // Get title from series page
      try {
        const dataArray = await CloudflareBypass.fetchElementTextMatches(uri, ".seriestitlenu");
        if (dataArray.length != 1) {
          throw `Invalid amount of elements with class 'seriestitlenu'`;
        }
  
        title = dataArray[0];
      } catch(e) {
        // If we have any kind of issue getting the data, assume this uri is not a valid series link
        return null;
      }
    }

    const manga = new NovelUpdatesSeries();
    manga.id = id;
    manga.title = title;
    return manga;
  }

  public static toMangaUrl(id: string): string {
    return `https://novelupdates.com/series/${id}`;
  }

}