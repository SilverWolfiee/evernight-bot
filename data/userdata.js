import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let filePath
if(os.platform() === "win32"){
  filePath = "C:\\Users\\EnDragyy\\evernight-database\\users.json"
}
else{
  filePath= "/home/silverwolf/Windows/Users/EnDragyy/evernight-database/users.json"
}

export function loadUsers() {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const users = JSON.parse(fs.readFileSync(filePath, "utf8"));

  let updated = false;
  for (const id in users) {
    const user = users[id];
    if (!user.stats) {
      console.log(`Patching stats for user ${id}`);
      user.stats = {
        atk: 20,
        def: 10,
        maxHP: 100,
        critRate: 0.05,
        critDmg: 1.5,
        spd : 96
      };
      updated = true;
    }
    if (user.xp === undefined) {
      user.xp = 0;
      updated = true;
    }
    if (user.level === undefined) {
      user.level = 1;
      updated = true;
    }
    if (user.power === undefined) {
      user.power = 300;
      user.lastPowerUpdate = Date.now();
      updated = true;
    }
  }

  if (updated) {
    console.log("Users patched, writing file.");
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  }

  return users;
}

export function saveUsers(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

export function checkUser(userId) {
  const users = loadUsers();

  if (!users[userId]) {
    users[userId] = {
      jades: 0,
      credits: 0,
      pity: 0,
      xp: 0,
      level: 1,
      registeredAt: new Date().toISOString(),
      power: 300,
      lastPowerUpdate: Date.now(),
      lastDaily: 0,
      stats: {
        atk: 20,
        def: 10,
        maxHP: 100,
        critRate: 0.05,
        critDmg: 1.5,
        spd : 96
      }
    };
    saveUsers(users);
  }

  return users[userId];
}
