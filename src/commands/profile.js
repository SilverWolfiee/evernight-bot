import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadUsers } from "../../data/userdata.js";
import { getXpToLevel } from "../utils/level_mgr.js";

export const command = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View your or another user's profile")
  .addUserOption(option =>
    option
      .setName("target")
      .setDescription("The user whose profile you want to view")
      .setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser("target") || interaction.user;
  const users = loadUsers();
  const user = users[target.id];

  if (!user) {
    await interaction.reply({
      content:
        target.id === interaction.user.id
          ? "Please register first using /register"
          : `${target.username} has not registered yet.`,
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  const displayName = member?.nickname || target.username;

  const xpToNext = getXpToLevel(user.level);
  const progressRatio = Math.min(user.xp / xpToNext, 1);
  const totalBars = 10;
  const filledBars = Math.round(progressRatio * totalBars);

  const filled = "🟥";
  const empty = "⬛";
  const progressBar = filled.repeat(filledBars) + empty.repeat(totalBars - filledBars);

  const avatarURL = target.displayAvatarURL({ extension: "png", size: 1024 });

  const embed = new EmbedBuilder()
    .setTitle(`${displayName}'s Profile`)
    .setColor("#c60d03")
    .setThumbnail(avatarURL)
    .addFields(
      { name: "Level", value: `${user.level}`, inline: true },
      { name: "XP", value: `${user.xp} / ${xpToNext}`, inline: true },
      { name: "Progress", value: progressBar },
      { name: "Credits <:credit:1432377745626759380>", value: `${user.credits}`, inline: true },
      { name: "Jades <:stellar_jade:1432377631210344530>", value: `${user.jades}`, inline: true },
      { name: "Power <:power:1434577803013259425>", value: `${user.power}/300`, inline: true },
    );

  await interaction.reply({ embeds: [embed] });
}
