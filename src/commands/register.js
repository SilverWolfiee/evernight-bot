import { SlashCommandBuilder } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register your account");

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch("http://localhost:21000/register", { //replace with actual register domain
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: interaction.user.id,
        username: interaction.user.username,
      }),
    });

    const data = await res.json();
    await interaction.editReply(data.message);
  } catch (err) {
    console.error(err);
    await interaction.editReply(
      "Something went wrong while registering your account."
    );
  }
}
