import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadUsers } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
  .setName("gitprofile")
  .setDescription("View your linked GitHub profile stats.");

export async function execute(interaction) {
  try {
    const users = loadUsers();
    const user = users[interaction.user.id];

    if (!user || !user.github) {
      return interaction.reply({
        content: "📸 **Hold up!** You haven't linked your GitHub yet. Use `/linkgithub` first!",
        ephemeral: true
      });
    }

    const gh = user.github;
    const dateLinked = Math.floor(new Date(gh.linkedAt).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`🐙 ${gh.username}'s GitHub`)
      .setURL(gh.profileUrl)
      .setDescription(gh.bio || "No bio available.")
      .setThumbnail(gh.avatar)
      .setColor(0x8B0000) 
      .addFields(
        { name: "📂 Repositories", value: `${gh.repos}`, inline: true },
        { name: "👥 Followers", value: `${gh.followers}`, inline: true },
        { name: "👣 Following", value: `${gh.following}`, inline: true },
        { name: "🔗 Linked Since", value: `<t:${dateLinked}:R>`, inline: false }
      )
      .setFooter({ text: "Verified via Evernight OAuth", iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "Camera jammed!", ephemeral: true });
  }
}