import { BaseBot, BotCommandHandlerFunction, Dependency } from "bot-framework";
import { Guild } from "discord.js";

import { Store, StoreDependency } from "../support/store.js";
import { ChannelManagementHandler } from "../commands/channel_management.js";
import { MangadexCommandHandler } from "../commands/mangadex_commands.js";
import { MangaseeCommandHandler } from "../commands/mangasee_commands.js";
import { NewChapterEventHandler } from "../events/new_chapter_event.js";
import { SubManagementHandler } from "../commands/sub_management.js";
import { NewMangaAlertTopic } from "../constants/topics.js";
import { ScraperCommandsHandler } from "../commands/scraper_commands.js";

export class WeebBotImpl extends BaseBot {
  // Event handlers
  newChapterEventHandler: NewChapterEventHandler;

  constructor() {
    super("WeebBot");
  }

  public async init(discordToken: string): Promise<void> {
    // Wait on Store to be ready
    await StoreDependency.await();

    super.init(discordToken);
  }

  public initCustomEventHandlers(): void {
    // Subscribe to guild join/leave events, for ensuring guild set consistency
    this.discord.on('guildCreate', this.joinServerHandler);
    this.discord.on('guildDelete', this.leaveServerHandler);

    // Subscribe new chapter handler
    this.newChapterEventHandler = new NewChapterEventHandler(this.discord);
    NewMangaAlertTopic.subscribe("NewChapterEventHandler.newChapterHandler", this.newChapterEventHandler.newChapterHandler);
  }

  public loadInterfaces(): void {
    this.interfaces.push(new ChannelManagementHandler());
    this.interfaces.push(new MangadexCommandHandler());
    this.interfaces.push(new MangaseeCommandHandler());
    this.interfaces.push(new SubManagementHandler());
    this.interfaces.push(new ScraperCommandsHandler());
  }

  // Discord event handlers
  public async onReady(): Promise<void> {
    // Call fetch on every guild to make sure we have all the members cached
    const guilds = this.discord.guilds.cache.map(g => g.id);
    Store.addGuilds(...guilds);

    WeebBotDependency.ready();
  }

  private joinServerHandler = async (guild: Guild) => {
    this.logger.debug(`Joined guild: ${guild.name}`);
    Store.addGuilds(guild.id);
  }

  private leaveServerHandler = async (guild: Guild) => {
    this.logger.debug(`Left guild: ${guild.name}`);
    Store.removeGuild(guild.id);
  }

  public getHelpMessage(): string {
    const msg = 
      "Weeb bot - Ping roles on new chapters in Mangadex\n" +
      "\n" +
      "!notifchannel <role> - Set current channel as the notification channel for given role\n" +
      "!unnotif <role> - Remove notif channel from given role\n" +
      "!sub <role> <manga url> - Subscribe given role to given manga\n" +
      "!unsub <role> <manga url> - Unubscribe given role from given manga\n" +
      "!listsubs <role> <scraper type> - List all subscriptions for given role and scraper\n" +
      "\n" +
      "!scraperstatus <scraper type> [<enable>] - Get (or set) status of a scraper\n" +
      "\n" +
      "!dexstatus - Get last known status of Mangadex\n" +
      "\n" +
      "!getaliases <manga url> - Get all aliases for given manga - Used by Mangasee parser\n" +
      "!addalias <manga url> <alias> -Add an alias to a given manga\n" +
      "!delalias <manga url> <alias> - Delete an alias from a given manga\n" +
      "\n" +
      "Subscription commands will only work after !notifchannel has been called for the channel";

    return msg;
  }

}

export const WeebBot = new WeebBotImpl();

export const WeebBotDependency = new Dependency("WeebBot");
