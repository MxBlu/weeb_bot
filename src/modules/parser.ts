import { Logger } from "bot-framework";

import { NewMangaAlertTopic, NewMangadexItemTopic, NewMangaseeItemTopic } from "../constants/topics.js";
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
  }

  private itemHandler = async (item: MangaChapter): Promise<void> => {
    // Check whether the manga has a existing subscription
    const guilds = Store.getGuilds();
    for (const guildId of guilds) {
      // If any guild has any roles that have subscribed to this manga
      // Notify for a new chapter with a list of roles subbed
      const roles = await Store.getRoles(guildId);
      const rolesToAlert = new Set<string>();
      for (const roleId of roles) {
        const titles = await Store.getTitles(guildId, roleId);
        if (titles.has(item.titleId)) {
          rolesToAlert.add(roleId);
        }
      }
      if (rolesToAlert.size > 0) {
        const mangaTitle = await Store.getTitleName(item.titleId);
        const title = `${mangaTitle} - Chapter ${item.chapterNumber}`;

        this.logger.debug(`New subscribed chapter for roles [ ${Array.from(rolesToAlert.values()).join(', ')} ] in guild ${guildId}: ` +
            `${title}`);
        
        const mangaAlert = new MangaAlert();
        mangaAlert.mangaChapter = item;
        mangaAlert.mangaTitle = mangaTitle;
        mangaAlert.guildId = guildId;
        mangaAlert.rolesIds = rolesToAlert;

        NewMangaAlertTopic.notify(mangaAlert);
      }
    }
  }
}

export const MangaParser = new MangaParserImpl();