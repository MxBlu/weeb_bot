const { sendCmdMessage } = require("../../util/bot_utils");

module.exports = (imm, logger) => {
  return {

    dexstatusHandler: async (command) => {
      const dexStatus = imm.getLastMessage('mangadexPulse');
      if (dexStatus?.status === true) {
        let message = `Mangadex up`;
        if (dexStatus.lastDown != null) {
          message += ` since ${dexStatus.lastDown.toUTCString()}`;
        }
        sendCmdMessage(command.message, message, 2, logger);
      } else if (dexStatus?.status === false) {
        let message = `Mangadex unreachable`;
        if (dexStatus.lastUp != null) {
          message += ` since ${dexStatus.lastUp.toUTCString()}`;
        }
        sendCmdMessage(command.message, 'Mangadex was unreachable in the last 5 mins', 2, logger);
      } else {
        sendCmdMessage(command.message, 'Mangadex status unknown', 2, logger);
      }
    }

  }
}