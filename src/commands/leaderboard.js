import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { promises as fs } from "fs";

export const command = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View leaderboard by Jades, Credits, or Level")
  .addStringOption(option =>
    option
      .setName("type")
      .setDescription("Choose leaderboard type")
      .setRequired(true)
      .addChoices(
        { name: "Credits", value: "credits" },
        { name: "Jades", value: "jades" },
        { name: "Level", value: "level" }
      )
  )
  .addStringOption(option =>
    option
      .setName("scope")
      .setDescription("Global or Server only")
      .setRequired(false)
      .addChoices(
        { name: "Global", value: "global" },
        { name: "Here", value: "here" }
      )
  );

export async function execute(interaction) {
  await interaction.deferReply();
  try {
    const type = interaction.options.getString("type");
    const scope = interaction.options.getString("scope") || "global";

    const raw = await fs.readFile("data/users.json", "utf8");
    const users = JSON.parse(raw || "{}");
    let entries = Object.entries(users);

    
    if (scope === "here") {
      const guild = interaction.guild;
      const fetchedMembers = await Promise.all(
        entries.map(([id]) => guild.members.fetch(id).catch(() => null))
      );
      const memberIds = new Set(fetchedMembers.filter(m => m).map(m => m.user.id));
      entries = entries.filter(([id]) => memberIds.has(id));
    }

    
    entries.sort((a, b) => {
      if (type === "level") {
        if (b[1].level === a[1].level) {
          return (b[1].xp || 0) - (a[1].xp || 0);
        }
      }
      return (b[1][type] || 0) - (a[1][type] || 0);
    });

    const top10 = entries.slice(0, 10);
    if (top10.length === 0) {
      return interaction.editReply({ content: "No data found.", flags: 64 });
    }

    
    const leaderboard = top10
      .map(([id, data], i) => {
        const value = data[type] ?? 0;
        let displayValue = value.toLocaleString();

        if (type === "level") displayValue = `Level ${value}`;
        else if (type === "credits") displayValue += " <:credit:1432377745626759380>";
        else if (type === "jades") displayValue += " <:stellar_jade:1432377631210344530>";

        return `**#${i + 1}** <@${id}> — ${displayValue}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard (${scope === "here" ? "Server" : "Global"})`)
      .setDescription(leaderboard)
      .setColor(0xa90000);

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Leaderboard error:", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "Error running leaderboard.", ephemeral: true });
    }
  }
}
