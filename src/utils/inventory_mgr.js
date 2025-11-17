import { loadUsers, saveUsers } from "../../data/userdata.js";

function ensureInventory(user) {
  if (!user.inventory) user.inventory = { characters: {}, lightCones: {} };
  if (!user.inventory.characters) user.inventory.characters = {};
  if (!user.inventory.lightCones) user.inventory.lightCones = {};
}

export function addCharacter(userId, charName) {
  const users = loadUsers();
  const user = users[userId];
  if (!user) return;

  ensureInventory(user);

  if (!user.inventory.characters[charName]) user.inventory.characters[charName] = 1;
  else user.inventory.characters[charName]++;

  saveUsers(users); 
}

export function addLightCone(userId, coneName) {
  const users = loadUsers();
  const user = users[userId];
  if (!user) return;

  ensureInventory(user);

  if (!user.inventory.lightCones[coneName]) user.inventory.lightCones[coneName] = 1;
  else user.inventory.lightCones[coneName]++;

  saveUsers(users); 
}

export function getInventory(userId) {
  const users = loadUsers();
  const user = users[userId];
  if (!user) return null;

  ensureInventory(user);
  return user.inventory;
}

export function resetInventory(userId) {
  const users = loadUsers();
  const user = users[userId];
  if (!user) return;

  user.inventory = { characters: {}, lightCones: {} };
  saveUsers(users);
}
