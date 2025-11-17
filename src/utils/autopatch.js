import { loadUsers, saveUsers } from "../../data/userdata.js";

export function patchAllUsers() {
  const users = loadUsers();
  let updated = false;

  for (const id in users) {
    const user = users[id];

    if (!user.stats) {
      user.stats = { atk: 20, def: 10, maxHP: 100, critRate: 0.05, critDmg: 1.5 };
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
    saveUsers(users);
  }
}
