/*
  Simple generic messaging bus
  Could I just have use Node.JS emitters? ...Yes probably, but I didn't think of it till I was done
  This has better logging for my sanity anyway
*/

// Construct with logger instance
module.exports = (logger) => {
  // Store of topics, with last data and subscribers
	var topics = {};

	return {
    
    // Create a new topic
    // Assumes topic doesn't presently exist
		newTopic: (name) => {
			if (name in topics) {
				logger.error(`Topic ${topic} already exists`);
				return;
			}

			topics[name] = {
				subscribers: [],
				data: null
			};
      logger.info(`New topic ${name}`, 3);
    },
    
    // Delete an existing topic
    // Assumes topic does exist
    deleteTopic: (name) => {
			if (!(name in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
			}

      delete topics[name];
      logger.info(`Deleted topic ${name}`, 3);
    },
    
    // Add function as listener to topic
    // Must be defined as a standard function, not an arrow function. Otherwise, func.name is null
    // Assumes topic does exist
    subscribe: (topic, func) => {
      if (!(topic in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
      }

      if (func in topics[topic].subscribers) {
				logger.error(`Function ${func.name} is already subscribed to Topic ${topic}`);
				return;
      }

      topics[topic].subscribers.push(func);
      logger.info(`Function ${func.name} subscribed to Topic ${topic}`, 3);
    },

    // Remove function from topic listeners
    // Assumes topic does exist
		unsubscribe: (topic, func) => {
      if (!(topic in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
      }
      
      for (var i = 0; i < topics[topic].subscribers.length; i++) {
        if (topics[topic].subscribers[i].name == func.name) {
          topics[topic].subscribers = topics[topic].subscribers.splice(i, 1);
          logger.info(`Function ${func.name} unsubscribed from Topic ${topic}`, 3);
          return;
        }
      }
      
      logger.error(`Function ${func.name} was not subscribed to Topic ${topic}`);
		},

    // Call all subscribed functions for a topic with provided data asynchronously
    // Assumes topic does exist
		notify: (topic, data) => {
      if (!(topic in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
      }

      logger.info(`Notifying topic ${topic}`, 3);
      topics[topic].data = data;
      topics[topic].subscribers.forEach( async (f) => {
        f(topic, data);
      })
    },
    
    // Get the last data that was added to the topic
    // Assumes topic does exist
    getLastMessage: (topic) => {
      if (!(topic in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
      }

      return topics[topic].data;
    }

  }
}