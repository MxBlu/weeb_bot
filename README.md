# Weeb Bot

Bot to notify users when new manga/light novel chapters are published

Concept is around polling providers to check for new content since the last poll, processing the polled data into a common format (see `MangaChapter` class), then iterating over the new items and testing them against the subscriptions under Discord roles. Notifications are sent to channels tied to roles (using `/notifchannel <role>`).

## Prerequisites
### Generating a .dotenv
You can follow the example found in `.env.example`, or read the template in `.env.template` for more information.

The application **will not start** without a .env.

### Node.js
The minimum version of Node.js this package will wil run under is v12. ts-node and other platforms have not been tested.

### Yarn
For this package, `yarn` is utilized. If you do not have yarn install, please install it here:
- https://yarnpkg.com/


## Getting Started

To run the program, you need to first run

`yarn run build`.

Then, you should be able to run

`yarn start`.
