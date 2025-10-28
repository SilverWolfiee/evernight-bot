import { SlashCommandBuilder, EmbedBuilder , AttachmentBuilder} from "discord.js";
import { loadUsers } from "../../data/userdata.js";
import { getXpToLevel } from "../utils/level_mgr.js";

export const command = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View your account profile");

export async function execute(interaction) {
  const users = loadUsers();
  const user = users[interaction.user.id];

  if (!user) {
    await interaction.reply("Please register first using /register");
    return;
  }

  const xpToNext = getXpToLevel(user.level);
  const progressRatio = Math.min(user.xp / xpToNext, 1);
  const totalBars = 10;
  const filledBars = Math.round(progressRatio * totalBars);
  

  const filled = "🟥";
  const empty = "⬛";
  const progressBar = filled.repeat(filledBars) + empty.repeat(totalBars - filledBars);
  const profileImage = new AttachmentBuilder("./assets/evernight_profile.png");
  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.username}'s Profile`)
    .addFields(
      { name: "Level", value: `${user.level}`, inline: true },
      { name: "XP", value: `${user.xp} / ${xpToNext}`, inline: true },
      { name: "Progress", value: progressBar },
      { name: "Credits <:credit:1432377745626759380>", value: `${user.credits}`, inline: true },
      { name: "Jades <:stellar_jade:1432377631210344530> ", value: `${user.jades}`, inline: true },
    )
    .setColor("#c60d03")
    .setThumbnail("attachment://evernight_profile.png")

  await interaction.reply({ embeds: [embed] , files: [profileImage]});
}
