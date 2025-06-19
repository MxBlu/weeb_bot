import { Logger } from "bot-framework";
import { ScraperType } from "../constants/scraper_types.js";

import { NewComickItemTopic, NewMangaAlertTopic, NewMangadexItemTopic, NewMangaseeFallbackItemTopic, NewMangaseeItemTopic, NewNovelUpdatesItemTopic, NewWeebCentralItemTopic } from "../constants/topics.js";
import { MangaAlert } from "../models/MangaAlert.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { Store } from "../support/store.js";

export class MangaParserImpl {

  logger: Logger;

  constructor() {
    this.logger = new Logger("MangaParser");
  }

  public init(): void {
    NewMangadexItemTopic.subscribe("MangaParser.itemHandler", this.itemHandler);
    NewMangaseeItemTopic.subscribe("MangaParser.itemHandler", this.itemHandler);
    NewMangaseeFallbackItemTopic.subscribe("MangaParser.itemHandler", this.itemHandler);
    NewNovelUpdatesItemTopic.subscribe("MangaParser.itemHandler", this.itemHandler);
    NewWeebCentralItemTopic.subscribe("MangaParser.itemHandler", this.itemHandler);
    NewComickItemTopic.subscribe("MangaParser.itemHandler", this.itemHandler);
  }

  private itemHandler = async (item: MangaChapter): Promise<void> => {
    // Check whether the manga has a existing subscription
    const guilds = Store.getGuilds();
    const subscribers = await Store.getSubscriptionsForTitle(item.type, item.titleId);
    for (const guildId of guilds) {
      // Notify for a new chapter with a list of roles subbed
      const rolesToAlert = subscribers.filter(sub => sub.guildId === guildId).map(sub => sub.roleId);
      if (rolesToAlert.length > 0) {
        const mangaTitle = await Store.getTitleName(item.type, item.titleId);
        const title = `${mangaTitle} - Chapter ${item.chapter}`;

        this.logger.debug(`New subscribed chapter for roles [ ${Array.from(rolesToAlert.values()).join(', ')} ] in guild ${guildId}: ` +
            `'${title}' of ${ScraperType[item.type]}`);
        
        const mangaAlert = new MangaAlert();
        mangaAlert.mangaChapter = item;
        mangaAlert.mangaTitle = mangaTitle;
        mangaAlert.guildId = guildId;
        mangaAlert.rolesIds = rolesToAlert;

        NewMangaAlertTopic.notify(mangaAlert);
      } else {
        this.logger.trace(`No roles to alert for: Guild ${guildId} Title ${item.titleId}`)
      }
    }
  }
}

export const MangaParser = new MangaParserImpl();