import { SlashCommandBuilder } from "discord.js";
import { loadUsers, saveUsers } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register your account");

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true }); 

    const userId = interaction.user.id;
    const users = loadUsers();

    if (users[userId]) {
      await interaction.editReply(`You already have an account, ${interaction.user.username} 🦼`);
      return;
    }

    users[userId] = {
      jades: 1600,
      credits: 10000,
      pity: 0,
      registeredAt: new Date().toISOString(),
    };

    saveUsers(users);

    await interaction.editReply(
      `Successfully registered an account!\nYou received **1600 jades** and **10,000 credits** as a starting gift.`
    );
  } catch (err) {
    console.error("Error in /register:", err);
    if (!interaction.replied) {
      await interaction.reply({
        content: "Something went wrong while registering your account.",
        flags: 64, 
      });
    }
  }
}
