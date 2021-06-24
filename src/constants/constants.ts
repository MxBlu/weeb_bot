import * as dotenv from 'dotenv';
dotenv.config();

import { LogLevels } from "../util/logger.js";

// Default logging level
export const DEFAULT_LOG_LEVEL = Number(process.env.LOG_LEVEL) || LogLevels.INFO3;

// Default time for a modal to stay active
export const DEFAULT_MODAL_DURATION = 120000; // 2 minutes

// Mangadex feed requesting settings
export const MANGADEX_FEED_REFRESH_INTERVAL = Number(process.env.MANGADEX_FEED_REFRESH_INTERVAL);

// Mangasee scraping settings
export const MANGASEE_REFRESH_INTERVAL = Number(process.env.MANGASEE_REFRESH_INTERVAL);
export const MANGASEE_DISABLED = process.env.MANGASEE_DISABLED == "true";