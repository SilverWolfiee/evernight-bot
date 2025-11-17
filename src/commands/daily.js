import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadUsers, saveUsers } from "../../data/userdata.js";
import { getTier, addXp } from "../utils/level_mgr.js";


export const command = new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim daily rewards(resets every 12AM UTC)")

export async function execute(interactions) {
    const users = loadUsers()
    const user = users[interactions.user.id]
    if(!user){
        await interactions.reply({
            content : "Please create an account using /register",
            ephemeral : true,

        })
        return
    }
    const now = new Date();
    const currentUTC = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()
    const lastClaim = user.lastDaily || 0
    const lastDate = new Date(lastClaim)
    const hasReset =
    now.getUTCFullYear() !== lastDate.getUTCFullYear() ||
    now.getUTCMonth() !== lastDate.getUTCMonth() ||
    now.getUTCDate() !== lastDate.getUTCDate()
    if (!hasReset) {
    const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
    const hoursLeft = Math.floor((nextReset - now) / 3600000)
    const minutesLeft = Math.floor(((nextReset - now) % 3600000) / 60000)

    await interactions.reply({
      content: `You already claimed your daily reward!\nCome back in **${hoursLeft}h ${minutesLeft}m**.`,
      ephemeral: true,
    })
    return;
  }
  const baseCredits = 10000;
  const baseJades = 1600;
  const tier = getTier(user.level)
  const creditMultiplier = 1 + tier * 0.5;
  const jadeMultiplier = 1 + tier * 0.25;
  const xpGain = Math.floor(1000 * Math.pow(1.08, user.level) * (1 + tier * 0.1));
  const creditRewards = Math.floor(baseCredits * creditMultiplier)
  const jadesRewards = Math.floor(baseJades * jadeMultiplier)

  user.jades += jadesRewards
  user.credits += creditRewards
  user.lastDaily = now.getTime();
  const leveledUp = addXp(user, xpGain)

  const nextResetUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const nextResetLocal = nextResetUTC.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
  });
  saveUsers(users);
  const embed = new EmbedBuilder()
    .setTitle("Daily Reward Claimed <:evernight_daily:1432392306387980451>")
    .addFields(
      { name: "<:stellar_jade:1432377631210344530> Stellar Jades", value: `${jadesRewards}`, inline: true },
      { name: "<:credit:1432377745626759380> Credits", value: `${creditRewards}`, inline: true },
      { name: "XP Gained", value: `${xpGain}`, inline: true },
      { name: "Current Level", value: `${user.level}`, inline: true },
      { name: "Next Reset", value: `${nextResetLocal}`, inline: true },
    )
    .setColor(leveledUp ? "#00ff88" : "#900c00");
    await interactions.reply({ embeds: [embed] });
}