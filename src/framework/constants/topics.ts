import { MessengerTopic } from "../imm";

// Message topic for Discord error logging
export const NewErrorLogTopic = new MessengerTopic<string>("newErrorLog");