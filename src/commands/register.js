import { SlashCommandBuilder } from "discord.js";
import { loadUsers, saveUsers } from "../utils/userData.js";


export const command = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register your account")

export async function execute(interaction){
    const userId = interaction.user.id;
    const user = loadUsers();
    if(user[userId]){
        await interaction.reply({
            content : "You already have an account${interaction.user.username} 🦼",
            ephemeral : true,
        })
        return

    }
    users[userId] = {
    jades: 1600,
    credits: 10000,
    pity: 0,
    registeredAt: new Date().toISOString(),
  }
  saveUsers(user)
  await interaction.reply(`Succesfully Registered an account\n You received **1600 jades** and **10,000 credits** as a starting gift.`)
}