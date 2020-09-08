module.exports = (logger) => {
	var topics = {};

	return {
    
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
    
    deleteTopic: (name) => {
			if (!(name in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
			}

      delete topics[name];
      logger.info(`Deleted topic ${name}`, 3);
    },
    
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

		unsubscribe: (topic, func) => {
      if (!(topic in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
      }
      
      for (var i = 0; i < topics[topic].subscribers.length; i++) {
        if (topics[topic].subscribers[i]) {
          topics[topic].subscribers.splice(i, 1);
          logger.info(`Function ${func.name} unsubscribed from Topic ${topic}`, 3);
          return;
        }
      }
      
      logger.error(`Function ${func.name} was not subscribed to Topic ${topic}`);
		},

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
    
    getLastMessage: (topic) => {
      if (!(topic in topics)) {
				logger.error(`Topic ${topic} does not exist`);
				return;
      }

      return topics[topic].data;
    }

  }
}