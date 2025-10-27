import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { loadUsers } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View your Evernight account profile");

export async function execute(interaction) {
  const users = loadUsers();
  const user = users[interaction.user.id];

  if (!user) {
    await interaction.reply({
      content: "Please create an account using /register first",
      ephemeral: true,
    });
    return;
  }
  const profile = new AttachmentBuilder("./assets/evernight_profile.png");
  const embed = new EmbedBuilder()
    .setTitle(`**${interaction.user.username}**'s`)
    .setDescription(`Account Balance`)
    .addFields(
      { name: "Jades <:stellar_jade:1432377631210344530>", value: `${user.jades}`, inline: true },
      { name: "Credits <:credit:1432377745626759380>", value: `${user.credits}`, inline: true },
      { name: "Pity", value: `${user.pity}`, inline: true }
    )
    .setFooter({ text: `Registered at ${new Date(user.registeredAt).toLocaleString()}` })
    .setColor("#a90000")
    .setThumbnail("attachment://evernight_profile.png");

  await interaction.reply({ embeds: [embed], files: [profile] });
}
