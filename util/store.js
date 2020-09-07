const fs            = require('fs');
const AsyncLock     = require('async-lock');

module.exports = (dbfile, logger) => {
    var db = {};
    const dbLock = new AsyncLock();

    const loadDb = () => {
        try {
            db = JSON.parse(fs.readFileSync(dbfile));
        } catch (e) {
            logger.error(e);
        }
    }

    const saveDb = () => {
        try {
            fs.copyFileSync(dbfile, dbfile + '.' + new Date().getTime().toString());
        } catch (e) {
            logger.info('No previous db, no replica created', 2);
        }
        fs.writeFileSync(dbfile, JSON.stringify(db));
    }

    loadDb();

    return {

        get: async (key) => {
            return key in db ? Array.from(db[key].values()) : new Set();
        },

        append: async (key, value) => {
            dbLock.acquire(key, () => {
                if (!(key in db)) {
                    db[key] = new Set();
                }
                db[key].add(value);
                saveDb();
            }).catch((err) => {
                logger.error(`store.append failed: ${err}`);
            });
        },

        remove: async (key, value) => {
            dbLock.acquire(key, () => {
                if (key in db) {
                    db[key].delete(value);
                    saveDb();
                }
            }).catch((err) => {
                logger.error(`store.remove failed: ${err}`);
            });
        },

        clear: async (key, value) => {
            dbLock.acquire(key, () => {
                if (key in db) {
                    db[key].clear();
                    saveDb();
                }
            }).catch((err) => {
                logger.error(`store.cler failed: ${err}`);
            });
        }
    }
}