import { MangaAlert } from "../model/MangaAlert.js";
import { MangaChapter } from "../model/MangaChapter.js";
import { MangadexPulse } from "../modules/mangadex_scraper.js";
import { MessengerTopic } from "../util/imm.js";

// Keep error topic separate 

// Message topic for Discord error logging
export const NewErrorLogTopic = new MessengerTopic<string>("newErrorLog");

// Message topic for a new alert for a chapter
export const NewMangaAlertTopic = new MessengerTopic<MangaAlert>("NewMangaAlertTopic");

// Message topic for a new Mangasee chapter being published
export const NewMangaseeItemTopic = new MessengerTopic<MangaChapter>("NewMangaseeItemTopic");

// Message topic for a new Mangadex chapter being published
export const NewMangadexItemTopic = new MessengerTopic<MangaChapter>("NewMangadexItemTopic");

// Message topic for last known Mangadex API status
export const MangadexPulseTopic = new MessengerTopic<MangadexPulse>("MangadexPulseTopic");