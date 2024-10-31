import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandBuilder, CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { AutocompleteInteraction, ChatInputCommandInteraction, CommandInteraction } from "discord.js";
import { FIFOCache } from "../support/fifo_cache.js";

import { ScraperHelper } from "../support/scrapers.js";
import { Cache, Store, TitleCacheRecord } from "../support/store.js";

const SUGGESTION_PREFIX = 'suggestion:';

export class UnsubCommand implements CommandProvider<ChatInputCommandInteraction> {
  logger: Logger;

  suggestionCache: FIFOCache<string, TitleCacheRecord[]>;

  constructor() {
    this.logger = new Logger("UnsubCommand");
    this.suggestionCache = new FIFOCache(5);
  }
      
  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('unsub')
        .setDescription('Unsubscribe given manga from given role')
        .addRoleOption(builder =>
          builder.setName('role')
            .setDescription('Role')
            .setRequired(true)
        ).addStringOption(builder =>
          builder.setName('url')
            .setDescription('Manga URL')
            .setRequired(true)
            .setAutocomplete(true)
        ) as unknown as CommandBuilder
    ];
  }

  public provideHelpMessage(): string {
    return "!unsub <role> <manga url> - Unsubscribe given manga from given role";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');
    let url = interaction.options.getString('url');

    if (url.startsWith(SUGGESTION_PREFIX)) {
      this.logger.debug(
        `Fetching suggestions for {guild=${guild.id},role=${role.id}}`);
      // Get suggestion out of the cache
      const suggestionId = `${interaction.channel.id}${interaction.user.id}`;
      const suggestions = this.suggestionCache.get(suggestionId);
      if (suggestions == null || suggestions.length == 0) {
        throw `No suggestions found - bump FIFO cache size?`;
      }
      const index = parseInt(url.substring(SUGGESTION_PREFIX.length));
      url = suggestions[index].url;
      // Clean up from the cache
      this.suggestionCache.delete(suggestionId);
    }

    const subscribable = await ScraperHelper.parseUri(url);
    if (subscribable == null) {
      sendCmdReply(interaction, 'Error: Unknown URL', this.logger, LogLevel.DEBUG);
      return;
    }

    await Store.delTitle(guild.id, role.id, subscribable.type, subscribable.id);
    sendCmdReply(interaction, `Removed title '${subscribable.title}' from role @${role.name}`, this.logger, LogLevel.INFO);
  }

  public async autocomplete(autocomplete: AutocompleteInteraction): Promise<void> {
    const guild = autocomplete.guild;
    const role = autocomplete.options.get('role');
    const partial: string = autocomplete.options.getString('url');

    // If we have no role, we have nothing to suggest
    if (role == null) {
      await autocomplete.respond([]);
      return;
    }

    const roleId = role.value as string;

    // If the partial is actually a suggestions string, return the old suggestions
    if (partial.startsWith('suggestion:')) {
      const oldSuggestions =
        this.suggestionCache.get(`${autocomplete.channel.id}${autocomplete.user.id}`);

      this.logger.debug(
        `Returned old suggestions for {guild=${guild.id},role=${roleId},term=${partial}}: ${oldSuggestions.length} suggestions`);

      // If suggestions exist, return them. Otherwise, return an empty list
      if (oldSuggestions != null) {
        await autocomplete.respond(
          oldSuggestions.map(
            (suggestion, index) => ({ 
              name: `${this.ellipsify(suggestion.title, 80)} - ${suggestion.scraper}`, 
              value: `${SUGGESTION_PREFIX}${index}`
            })));
      } else {
        await autocomplete.respond([]);
      }
      return;
    }


    let suggestions: TitleCacheRecord[] = [];
    if (partial == null || partial.length == 0) {
      // If there isn't a search query, just get all titles
      suggestions = await Cache.getTitleRecordsAll(guild.id, roleId);
    } else {
      // If there is a query, use Fuse to search for it
      const search = await Cache.getSearchAll(guild.id, roleId);
      suggestions = search.search(partial).map(result => result.item);
    }

    // Only take the top 25 suggestions
    suggestions = suggestions.slice(0, 25);
    // Cache the suggestions for the users
    this.suggestionCache.set(`${autocomplete.channel.id}${autocomplete.user.id}`, suggestions);

    this.logger.debug(
      `Generated suggestions for {guild=${guild.id},role=${roleId},term=${partial}}: ${suggestions.length} suggestions`);

    // Respond with suggestion
    await autocomplete.respond(
      suggestions.map(
        (suggestion, index) => ({ 
          name: `${this.ellipsify(suggestion.title, 80)} - ${suggestion.scraper}`, 
          value: `${SUGGESTION_PREFIX}${index}`
        })));
  }

  private ellipsify(text: string, maxLen: number): string {
    if (text.length > maxLen) {
      return text.substring(0, maxLen - 3) + '...';
    } else {
      return text;
    }
  }
}