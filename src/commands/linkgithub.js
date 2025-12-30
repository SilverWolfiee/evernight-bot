import { SlashCommandBuilder } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("linkgithub")
  .setDescription("Link your GitHub account with Evernight");

export async function execute(interaction) {
  const userId = interaction.user.id;

  try {
    const res = await fetch(
      `http://localhost:21000/linkgithub?userId=${userId}`
    );
    const data = await res.json();

    if (!data.success) {
      return interaction.reply({
        content: data.message || "Failed to start GitHub linking.",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `🔗 **Link your GitHub account:**\n${data.url}`,
      ephemeral: true,
    });
  } catch (err) {
    console.error("linkgithub error:", err);
    await interaction.reply({
      content: "Backend unreachable.",
      ephemeral: true,
    });
  }
}
