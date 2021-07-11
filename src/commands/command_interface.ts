import { BotCommand } from "../modules/bot";

export type BotCommandHandlerFunction = (command: BotCommand) => Promise<void>;

export interface CommandInterface { 
  // commandName, function
  commands(): Map<string, BotCommandHandlerFunction>;
}