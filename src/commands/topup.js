import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadUsers, saveUsers } from "../../data/userdata.js";

const CREDIT_PER_JADE = 100;

export const command = new SlashCommandBuilder()
  .setName("topup")
  .setDescription("Exchange your Credits for Stellar Jades!")
  .addIntegerOption((option) =>
    option
      .setName("jades")
      .setDescription("The amount of Stellar Jades you want to buy")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction) {
  try {
    const users = loadUsers();
    const user = users[interaction.user.id];
    const requestedJades = interaction.options.getInteger("jades");

    if (!user) {
      await interaction.reply({
        content:
          "Wait! You need an account first! Use /register to get started!",
        ephemeral: true,
      });
      return;
    }

    const totalCost = requestedJades * CREDIT_PER_JADE;

    if ((user.credits || 0) < totalCost) {
      await interaction.reply({
        content:
          `Aww, you don't have enough Credits! <:evernight_cry:1433434486418182325>\n` +
          `Buying **${requestedJades.toLocaleString()}** Stellar Jades costs **${totalCost.toLocaleString()}** Credits.\n` +
          `You currently have **${(user.credits || 0).toLocaleString()}** Credits.`,
        ephemeral: true,
      });
      return;
    }

    user.credits -= totalCost;
    user.jades += requestedJades;

    saveUsers(users);

    const embed = new EmbedBuilder()
      .setTitle("💎 Top-up Successful!")
      .setColor("Purple")
      .setDescription(
        `Exchanged **${totalCost.toLocaleString()}** Credits for **${requestedJades.toLocaleString()}** Stellar Jades!\n\n` +
          `**New Balances:**\n` +
          `• Stellar Jades: **${user.jades.toLocaleString()}**\n` +
          `• Credits: **${user.credits.toLocaleString()}**`,
      )
      .setFooter({
        text: "Elysiavernight banking system",
      });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error executing /topup:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An unexpected error occurred during top-up!",
        ephemeral: true,
      });
    }
  }
}
