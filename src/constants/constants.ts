import * as dotenv from 'dotenv';
dotenv.config();

// Mangadex feed requesting settings
export const MANGADEX_FEED_REFRESH_INTERVAL = Number(process.env.MANGADEX_FEED_REFRESH_INTERVAL);
export const MANGADEX_CACHE_LOCATION = process.env.MANGADEX_CACHE_LOCATION;

// Mangasee scraping settings
export const MANGASEE_REFRESH_INTERVAL = Number(process.env.MANGASEE_REFRESH_INTERVAL);
export const MANGASEE_DISABLED = process.env.MANGASEE_DISABLED == "true";