import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandProvider, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { AutocompleteInteraction, CommandInteraction } from "discord.js";

import { ScraperHelper } from "../support/scrapers.js";
import { Cache, Store, TitleCacheRecord } from "../support/store.js";

export class UnsubCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;

  constructor() {
    this.logger = new Logger("UnsubCommand");
  }
      
  public provideSlashCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
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
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "!unsub <role> <manga url> - Unsubscribe given manga from given role";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const role = interaction.options.getRole('role');
    const url = interaction.options.getString('url');

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
    const partial = autocomplete.options.getString('url');

    // If we have no role, we have nothing to suggest
    if (role == null) {
      await autocomplete.respond([]);
      return;
    }

    const roleId = role.value as string;

    let suggestions: TitleCacheRecord[] = [];
    if (partial == null || partial.length == 0) {
      // If there isn't a search query, just get all titles
      suggestions = await Cache.getTitleRecordsAll(guild.id, roleId);
    } else {
      // If there is a query, use Fuse to search for it
      const search = await Cache.getSearchAll(guild.id, roleId);
      suggestions = search.search(partial).map(result => result.item);
    }

    // Respond with suggestion
    await autocomplete.respond(
      suggestions.slice(0, 25).map(
        suggestion => ({ 
          name: `${this.ellipsify(suggestion.title, 80)} - ${suggestion.scraper}`, 
          value: suggestion.url 
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