import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getInventory } from "../utils/inventory_mgr.js";

export const command = new SlashCommandBuilder()
  .setName("inventory")
  .setDescription("View your Inventory")
  .addStringOption(option =>
    option
      .setName("filter")
      .setDescription("Choose what to view")
      .setRequired(true)
      .addChoices(
        { name: "Characters", value: "characters" },
        { name: "Light Cones", value: "lightCones" }
      )
  );

export async function execute(interaction) {
  const filter = interaction.options.getString("filter");
  const inventory = getInventory(interaction.user.id);

  if (!inventory) {
    await interaction.reply({
      content: "Please create an account first with /register",
      ephemeral: true
    });
    return;
  }

  const items = inventory[filter];
  const displayName = interaction.member?.displayName || interaction.user.username;

  const embed = new EmbedBuilder()
    .setColor("#a90000")
    .setTitle(`${displayName}'s ${filter === "characters" ? "Characters" : "Light Cones"}`)
    .setTimestamp();

  if (Object.keys(items).length === 0) {
    embed.setDescription("You don't have any items yet. Go fulfill your gambling thirst!");
  } else {
    const list = Object.entries(items)
      .map(([name, count]) => `• **${name}** ×${count}`)
      .join("\n");
    embed.setDescription(list);
  }

  await interaction.reply({ embeds: [embed] });
}
