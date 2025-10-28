import fs from "fs";

const filePath = "./data/users.json";

export function loadUsers() {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const users = JSON.parse(fs.readFileSync(filePath, "utf8"));

 
  let updated = false;
  for (const id in users) {
    const user = users[id];
    if (user.xp === undefined) {
      user.xp = 0;
      updated = true;
    }
    if (user.level === undefined) {
      user.level = 1;
      updated = true;
    }
  }


  if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    console.log("Patched legacy users with missing XP/level fields.");
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
      lastDaily: 0,
    };
    saveUsers(users);
  }

  return users[userId];
}
