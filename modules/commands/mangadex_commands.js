const { sendCmdMessage } = require("../../util/bot_utils");

module.exports = (imm, logger) => {
  return {

    dexstatusHandler: async (command) => {
      const dexStatus = imm.getLastMessage('mangadexPulse');
      if (dexStatus === true) {
        sendCmdMessage(command.message, 'Mangadex was reachable in the last 5 mins', 2, logger);
      } else if (dexStatus === false) {
        sendCmdMessage(command.message, 'Mangadex was unreachable in the last 5 mins', 2, logger);
      } else {
        sendCmdMessage(command.message, 'Mangadex status unknown', 2, logger);
      }
    }

  }
}