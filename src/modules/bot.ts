import { sendMessage, Dependency, Logger, LogLevel, NewLogEmitter, ScrollableModalManager } from "bot-framework";
import { Message, Client as DiscordClient, TextChannel, Guild } from "discord.js";

import { Store, StoreDependency } from "../support/store.js";
import { ChannelManagementHandler } from "../commands/channel_management.js";
import { MangadexCommandHandler } from "../commands/mangadex_commands.js";
import { MangaseeCommandHandler } from "../commands/mangasee_commands.js";
import { NewChapterEventHandler } from "../commands/new_chapter_event.js";
import { SubManagementHandler } from "../commands/sub_management.js";
import { NewMangaAlertTopic } from "../constants/topics.js";
import { ScraperCommandsHandler } from "../commands/scraper_commands.js";

const errorChannel: string = process.env.DISCORD_ERROR_CHANNEL;

const commandSyntax = /^\s*!([A-Za-z]+)((?: +[^ ]+)+)?\s*$/;

type BotCommandHandlerFunction = (command: BotCommand) => Promise<void>;

export class BotCommand {
  message: Message;

  command: string;

  arguments: string[];
}

export class BotImpl {

  discord: DiscordClient;
  
  logger: Logger;

  // For when we hit an error logging to Discord itself
  errLogDisabled: boolean;
  // Manager for scrolling modals
  scrollableManager: ScrollableModalManager;
  // Map of command names to handlers
  commandHandlers: Map<string, BotCommandHandlerFunction>;

  // Command handlers
  channelManagementHandler: ChannelManagementHandler;
  mangadexCommandsHandler: MangadexCommandHandler;
  mangaseeCommandsHandler: MangaseeCommandHandler;
  scraperCommandsHandler: ScraperCommandsHandler;
  subManagementHandler: SubManagementHandler;

  // Event handlers
  newChapterEventHandler: NewChapterEventHandler;

  constructor() {
    this.errLogDisabled = false;
    this.logger = new Logger("Bot");
    this.commandHandlers = new Map<string, BotCommandHandlerFunction>();
  }

  public async init(discordToken: string): Promise<void> {
    this.discord  = new DiscordClient();
    this.scrollableManager = new ScrollableModalManager(this.discord);

    // Wait on Store to be ready
    await StoreDependency.await();

    this.initCommandHandlers();
    this.initEventHandlers();

    this.discord.login(discordToken);
  }

  private initCommandHandlers(): void {
    this.channelManagementHandler = new ChannelManagementHandler();
    this.mangadexCommandsHandler = new MangadexCommandHandler();
    this.mangaseeCommandsHandler = new MangaseeCommandHandler();
    this.scraperCommandsHandler = new ScraperCommandsHandler();
    this.subManagementHandler = new SubManagementHandler();

    this.commandHandlers.set("help", this.helpHandler);
    this.commandHandlers.set("h", this.helpHandler);
    this.commandHandlers.set("notifchannel", this.channelManagementHandler.notifchannelHandler);
    this.commandHandlers.set("unnotif", this.channelManagementHandler.unnotifHandler);
    this.commandHandlers.set("sub", this.subManagementHandler.subscribeHandler);
    this.commandHandlers.set("unsub", this.subManagementHandler.unsubscribeHandler);
    this.commandHandlers.set("listsubs", this.subManagementHandler.listsubsHandler);
    this.commandHandlers.set("scraperstatus", this.scraperCommandsHandler.scraperstatusHandler);
    this.commandHandlers.set("dexstatus", this.mangadexCommandsHandler.dexstatusHandler);
    this.commandHandlers.set("getaliases", this.mangaseeCommandsHandler.getaliasesHandler);
    this.commandHandlers.set("addalias", this.mangaseeCommandsHandler.addaliasHandler);
    this.commandHandlers.set("delalias", this.mangaseeCommandsHandler.delaliasHandler);
  }

  private initEventHandlers(): void {
    this.discord.once('ready', this.readyHandler);
    this.discord.on('message', this.messageHandler);
    this.discord.on('error', err => this.logger.error(`Discord error: ${err}`));
    this.discord.on('guildCreate', this.joinServerHandler);
    this.discord.on('guildDelete', this.leaveServerHandler);

    // Subscribe new chapter handler
    this.newChapterEventHandler = new NewChapterEventHandler(this.discord);
    NewMangaAlertTopic.subscribe("NewChapterEventHandler.newChapterHandler", this.newChapterEventHandler.newChapterHandler);
    // Subscribe to ERROR logs being published
    NewLogEmitter.on(LogLevel[LogLevel.ERROR], this.errorLogHandler);
  }

  // Utility functions

  private parseCommand(cmdMessage: Message): BotCommand {
    // Compare against command syntax
    const matchObj = cmdMessage.content.match(commandSyntax);

    // Check if command is valid
    if (matchObj == null || !this.commandHandlers.has(matchObj[1].toLowerCase())) {
      return null;
    }

    // Remove double spaces from arg string, then split it into an array
    // If no args exist (matchObj[2] == null), create empty array
    const cmdArgs = matchObj[2] ? matchObj[2].replace(/  +/g, ' ').trim().split(' ') : [];

    const command = new BotCommand();
    command.message = cmdMessage;
    command.command = matchObj[1].toLowerCase();
    command.arguments = cmdArgs;

    return command;
  }

  // Discord event handlers

  private readyHandler = (): void => {
    this.logger.info("Discord connected");

    // Call fetch on every guild to make sure we have all the members cached
    const guilds = this.discord.guilds.cache.map(g => g.id);
    Store.addGuilds(...guilds);

    BotDependency.ready();
  }

  private joinServerHandler = async (guild: Guild) => {
    this.logger.debug(`Joined guild: ${guild.name}`);
    Store.addGuilds(guild.id);
  }

  private leaveServerHandler = async (guild: Guild) => {
    this.logger.debug(`Left guild: ${guild.name}`);
    Store.removeGuild(guild.id);
  }

  private messageHandler = async (message: Message): Promise<void> => {
    // Ignore bot messages to avoid messy situations
    if (message.author.bot) {
      return;
    }

    const command = this.parseCommand(message);
    if (command != null) {
      this.logger.debug(`Command received from '${message.author.username}' in '${message.guild.name}': ` +
          `!${command.command} - '${command.arguments.join(' ')}'`);
      this.commandHandlers.get(command.command)(command);
    }
  }

  private helpHandler = async (command: BotCommand): Promise<void> => {
    if (command.arguments == null ||
          command.arguments[0] !== "weebbot") {
      // Only send help for !help weebbot
      return;
    }

    const msg = 
      "Weeb bot - Ping roles on new chapters in Mangadex\n" +
      "\n" +
      "!notifchannel <role> - Set current channel as the notification channel for given role\n" +
      "!unnotif <role> - Remove notif channel from given role\n" +
      "!sub <role> <manga url> - Subscribe given role to given manga\n" +
      "!unsub <role> <manga url> - Unubscribe given role from given manga\n" +
      "!listsubs <role> - List all subscriptions for given role\n" +
      "\n" +
      "!dexstatus - Get last known status of Mangadex\n" +
      "\n" +
      "!mangaseestatus [<status>] - Get (or with paramater, update) scraping status of Mangasee\n" +
      "!getaliases <manga url> - Get all aliases for given manga - Used by Mangasee parser\n" +
      "!addalias <manga url> <alias> -Add an alias to a given manga\n" +
      "!delalias <manga url> <alias> - Delete an alias from a given manga\n" +
      "\n" +
      "Subscription commands will only work after !notifchannel has been called for the channel";

    sendMessage(command.message.channel, msg);
  }

  // Error handler

  private errorLogHandler = async (level: string, log: string): Promise<void> => {
    if (!this.errLogDisabled) {
      try {
        // Should ensure that it works for DM channels too
        const targetChannel = await this.discord.channels.fetch(errorChannel);
        // Only send if we can access the error channel
        if (targetChannel != null && targetChannel instanceof TextChannel) {
          sendMessage(targetChannel, log);
        }
      } catch (e) {
        console.error('Discord error log exception, disabling error log');
        console.error(e);
        this.errLogDisabled = true;
      }
    }
  }

}

export const Bot = new BotImpl();

export const BotDependency = new Dependency("Bot");