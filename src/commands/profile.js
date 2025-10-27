import { SlashCommandBuilder, EmbedBuilder }from "discord.js"
import { loadUsers } from "../../data/userdata.js"
export const command = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View your Evernight account profile");


  export async function execute(interaction) {
    const users = loadUsers()
    const user = users[interaction.user.id]
    if(!user){
      await interaction.reply({
        content : "you don't have an account use /register to make one",
        ephemeral : true,
      })
      return
    }
    const emberd = new EmbedBuilder()
      .setTitle("Profile")
      .setDescription("Welcome, **${interaction.user.username}**")
      .addFields(
        { name: "Jades", value: `${user.jades}`, inline: true },
        { name: "Credits", value: `${user.credits}`, inline: true },
        { name: "Pity", value: `${user.pity}`, inline: true }
      )
      .setFooter({ text: `Registered at ${new Date(user.registeredAt).toLocaleString()}` })
      .setColor("#a90000ff");
    await interaction.reply({ embeds: [embed] });
  }