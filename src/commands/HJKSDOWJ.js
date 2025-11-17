// src/commands/HJKSDOWJ.js
import { SlashCommandBuilder } from "discord.js";
import { loadUsers, saveUsers, checkUser } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
  .setName("consume")
  .setDescription("Consume 30 power from your account");

export async function execute(interaction) {
  const userId = interaction.user.id;
  const users = loadUsers();
  checkUser(userId, users);

  const user = users[userId];

  if (user.power < 30) {
    await interaction.reply({ content: "You don't have enough power (need 30).", ephemeral: true });
    return;
  }

  user.power -= 30;
  user.lastPowerUpdate = Date.now();

  saveUsers(users);
  await interaction.reply(`✅ 30 power consumed! Remaining power: ${user.power}`);
}
