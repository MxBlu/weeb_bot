import { BaseBot, Dependency } from "bot-framework";
import { Guild } from "discord.js";

import { Store, StoreDependency } from "../support/store.js";
import { NewChapterEventHandler } from "../events/new_chapter_event.js";
import { NewMangaAlertTopic } from "../constants/topics.js";
import { NotifChannelCommand } from "../commands/notif_channel_command.js";
import { UnotifChannelCommand } from "../commands/unnotif_channel_command.js";
import { SubCommand } from "../commands/sub_command.js";
import { UnsubCommand } from "../commands/unsub_command.js";
import { ListSubsCommand } from "../commands/list_subs_command.js";
import { ScraperStatusCommand } from "../commands/scraper_status_command.js";
import { DexStatusCommand } from "../commands/dex_status_command.js";
import { GetAliasesCommand } from "../commands/get_aliases_command.js";
import { AddAliasCommand } from "../commands/add_alias_command.js";
import { DelAliasCommand } from "../commands/del_alias_command.js";
import { DexInfoCommand } from "../commands/dex_info_command.js";

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
    this.discord.once('ready', this.onreadyHandler);
    // Subscribe to guild join/leave events, for ensuring guild set consistency
    this.discord.on('guildCreate', this.joinServerHandler);
    this.discord.on('guildDelete', this.leaveServerHandler);

    // Subscribe new chapter handler
    this.newChapterEventHandler = new NewChapterEventHandler(this.discord);
    this.newChapterEventHandler.start();
    NewMangaAlertTopic.subscribe("NewChapterEventHandler.newChapterHandler", this.newChapterEventHandler.newChapterHandler);
  }

  public loadProviders(): void {
    this.providers.push(new NotifChannelCommand());
    this.providers.push(new UnotifChannelCommand());
    this.providers.push(new SubCommand());
    this.providers.push(new UnsubCommand());
    this.providers.push(new ListSubsCommand());
    this.providers.push(new ScraperStatusCommand());
    this.providers.push(new DexStatusCommand());
    this.providers.push(new GetAliasesCommand());
    this.providers.push(new AddAliasCommand());
    this.providers.push(new DelAliasCommand());
    this.providers.push(new DexInfoCommand());
  }

  public getHelpMessage(): string {
    return "Weeb bot - Ping roles on new chapters in Mangadex\n" + 
        "Subscription commands will only work after !notifchannel has been called for the channel";
  }

  // Discord event handlers

  public onreadyHandler = async (): Promise<void> => {
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
}

export const WeebBot = new WeebBotImpl();

export const WeebBotDependency = new Dependency("WeebBot");
