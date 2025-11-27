import sqlite3 from "sqlite3"
import fs from "fs"
import path from "path"
import os from  "os"


let basepath;
if(os === "win32"){
     basePath = "C:/Users/EnDragyy/evernight-database"
}
else{
    basePath = "/Users/EnDragyy/evernight-database"
}

if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
}
const dbPath = path.join(basePath, "users.db");
const db = new sqlite3.Database(dbPath);

db.run(`
    CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
    );
`)
export function getUser(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT data FROM users WHERE id = ?", [id], (err, row) => {
            if (err) return reject(err);

            if (!row) {
                const defaultUser = {
                    id,
                    jades: 0,
                    credits: 0,
                    pity: 0,
                    registeredAt: new Date().toISOString(),
                    xp: 0,
                    level: 1,
                    lastDaily: 0,
                    inventory: { characters: {}, lightCones: {} },
                    fourStarPity: 0,
                    guaranteedFeatured: false,
                    tokens: { month: 0, used: 0 },
                    power: 0,
                    lastPowerUpdate: 0,
                    stats: {},
                    rpg: {},
                    session: {},
                };
                saveUser(defaultUser)
                return resolve(defaultUser)
            }

            resolve(JSON.parse(row.data))
        })
    })
}

export function saveUser(userObj) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)",
            [userObj.id, JSON.stringify(userObj)],
            (err) => (err ? reject(err) : resolve())
        )
    })
}