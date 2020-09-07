const fs            = require('fs');
const AsyncLock     = require('async-lock');

module.exports = (dbfile, logger) => {
    var db = {};
    const dbLock = new AsyncLock();

    const loadDb = () => {
        try {
            var tempDb = JSON.parse(fs.readFileSync(dbfile));
            Object.keys(tempDb).forEach((key) => {
                db[key] = new Set(tempDb[key]);
            })
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
        var tempDb = {};
        Object.keys(db).forEach((key) => {
            tempDb[key] = Array.from(db[key].values());
        })
        fs.writeFileSync(dbfile, JSON.stringify(tempDb));
    }

    loadDb();

    return {

        getValue: (key) => {
            return key in db ? db[key] : new Set();
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