import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Logger } from './logger.js';

// Stealth plugin to hopefully avoid triggering CloudFlare
puppeteer.use(StealthPlugin());

// Fetch URIs using a Puppeteer instance to get around CloudFlare
class CloudflareBypassImpl {
  // Puppeteer browser instance
  browser: Browser;

  logger: Logger;

  constructor() {
    this.browser = null; // Instance starts unloaded
    this.logger = new Logger("CloudflareBypass");
  }

  // Ensure the browser instance is loaded and available for use
  public async ensureLoaded(): Promise<void> {
    if (this.browser == null) {
      this.browser = await puppeteer.launch();
    }
  }

  // Ensure the browser instance is unloaded (to save memory)
  public async ensureUnloaded(): Promise<void> {
    if (this.browser != null) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Fetch a URL using a Puppeteer instance (loading it if necessary)
  public async fetch(uri: string): Promise<string> {
    // Ensure we have a browser instance loaded for use
    await this.ensureLoaded();

    // Create a page and navigate to the URL, waiting for the content to be loaded
    const page = await this.browser.newPage();
    await page.goto(uri, {
      timeout: 45000,
      waitUntil: 'domcontentloaded'
    });

    // Get the page contents
    const content = await page.content();
    
    // Close the page async, logging an error if we run into one
    page.close().catch(reason => 
        this.logger.error(`Page failed to unload after request to ${uri}: ${reason}`));

    return content;
  }
}

export const CloudflareBypass = new CloudflareBypassImpl();