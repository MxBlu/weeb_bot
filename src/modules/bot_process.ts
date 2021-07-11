import { ChannelManagementHandler } from "../commands/channel_management";
import { MangadexCommandHandler } from "../commands/mangadex_commands";
import { MangaseeCommandHandler } from "../commands/mangasee_commands";
import { SubManagementHandler } from "../commands/sub_management";

export class BotProcess {

  // overloaded
  public async init(discordToken: string): Promise<void> {
    // abstracted
  }

  private instantiateCommandHandlers(): void {
    const channelManagementHandler = new ChannelManagementHandler();
    const mangadexCommandsHandler = new MangadexCommandHandler();
    const mangaseeCommandsHandler = new MangaseeCommandHandler();
    const subManagementHandler = new SubManagementHandler();
  }


}