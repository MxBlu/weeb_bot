import { Client as DiscordClient, GuildMember, Message, MessageReaction } from "discord.js";
import { DEFAULT_MODAL_DURATION } from "./constants/constants.js";
import { Logger } from "./logger.js";

export class ScrollableModal<T> {
  // Message that contains the modal
  message: Message;
  // Arbitrary stateful data
  props: T;
  // Function to call on remove
  removeHandler: (modal: ScrollableModal<T>) => Promise<void>;
  // Function to scroll left
  scrollLeftHandler: (modal: ScrollableModal<T>, reaction: MessageReaction, 
      user: GuildMember) => Promise<void>;
  // Function to scroll right
  scrollRightHandler: (modal: ScrollableModal<T>, reaction: MessageReaction, 
      user: GuildMember) => Promise<void>;

  public async activate(): Promise<void> {
    // Add nav reactions
    this.message.react("⬅️");
    this.message.react("➡️");
  }

  public async deactivate(): Promise<void> {
    // Remove all reactions
    this.message.reactions.removeAll();
    // If we have a function to call on removal, call it
    if (this.removeHandler != null) {
      this.removeHandler(this);
    }
  }

  public async scrollLeft(reaction: MessageReaction, user: GuildMember): Promise<void> {
    // If we have a function to scroll, call it
    if (this.scrollLeftHandler != null) {
      this.scrollLeftHandler(this, reaction, user);
    }
  }

  public async scrollRight(reaction: MessageReaction, user: GuildMember): Promise<void> {
    // If we have a function to scroll, call it
    if (this.scrollRightHandler != null) {
      this.scrollRightHandler(this, reaction, user);
    }
  }
}

export class ScrollableModalManager {

  discord: DiscordClient;
  // Active scroll modals
  activeModals: Map<string, ScrollableModal<unknown>>;
  // General logger
  logger: Logger;

  constructor(discord: DiscordClient) {
    this.discord = discord;
    this.activeModals = new Map();
    this.logger = new Logger("ScrollableModalManager");
  }

  public async addModal(modal: ScrollableModal<unknown>, duration = DEFAULT_MODAL_DURATION): Promise<void> {
    // Ensure the message doesn't already have an active modal
    if (this.activeModals.has(modal.message.id)) {
      this.logger.error(`Message ID ${modal.message.id} already has an active modal`);
      return;
    }

    // Add to active modal list
    this.activeModals.set(modal.message.id, modal);
    // Activate modal
    modal.activate();

    // Set lifetime timer
    setTimeout((m: Message) => this.removeModal(m), duration, modal.message);

    this.logger.trace(`Modal created for message ${modal.message.id}`);
  }

  public async removeModal(message: Message): Promise<void> {
    // Ensure message has an active modal to remove
    if (!this.activeModals.has(message.id)) {
      this.logger.error(`Message ID ${message.id} doesn't has an active modal`);
      return;
    }

    const modal = this.activeModals.get(message.id);
    modal.deactivate();
    
    // Remove from active modal list
    this.activeModals.delete(message.id);

    this.logger.trace(`Modal removed for message ${message.id}`);
  }

  public messageReactionHandler = async (reaction: MessageReaction, user: GuildMember): Promise<void> => {
    // Only handle reactions for active modals
    if (!this.activeModals.has(reaction.message.id)) {
      return;
    }

    // Ignore reacts by the bot itself
    if (user.id == this.discord.user.id) {
      return;
    }

    const modal = this.activeModals.get(reaction.message.id);
    const guildUser = await reaction.message.guild.members.fetch(user.id);
    
    // Handle emojis we care about
    // Remove reaction if we're handling em
    switch (reaction.emoji.name) {
    case "⬅️":
      // Scroll the modal left
      modal.scrollLeft(reaction, guildUser);
      reaction.users.remove(guildUser);
      break;
    case "➡️":
      // Scroll the modal right
      modal.scrollRight(reaction, guildUser);
      reaction.users.remove(guildUser);
      break;
    }
  }

}