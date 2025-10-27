import fs from "fs";

const filePath = "./data/users.json";

export function loadUsers() {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
      registeredAt: new Date().toISOString(),
    };
    saveUsers(users);
  }

  return users[userId];
}
