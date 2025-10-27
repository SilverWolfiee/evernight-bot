import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { loadUsers, saveUsers } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
  .setName("bet")
  .setDescription("Flip a coin and bet your credits.")
  .addStringOption(option =>
    option
      .setName("choice")
      .setDescription("Choose head or tail")
      .setRequired(true)
      .addChoices(
        { name: "Head", value: "head" },
        { name: "Tail", value: "tail" }
      )
  )
  .addIntegerOption(option =>
    option
      .setName("amount")
      .setDescription("Bet your credits")
      .setRequired(true)
  );

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

  const choice = interaction.options.getString("choice");
  const amount = interaction.options.getInteger("amount");

  if (amount < 2000) {
    await interaction.reply({
      content: "You must bet at least **2000 credits!**",
      ephemeral: true,
    });
    return;
  }

  if (user.credits < amount) {
    await interaction.reply({
      content: "Aww poor you, you don’t have enough money <:evernight_dog:1432386535520731166>",
      ephemeral: true,
    });
    return;
  }


  const outcomes = ["head", "tail"];
  const result = outcomes[Math.floor(Math.random() * 2)];


  const imageFile =
    result === "head"
      ? new AttachmentBuilder("./assets/march7th_head.png")
      : new AttachmentBuilder("./assets/evernight_tail.png");

  let message;
  let color;

  if (choice === result) {
    const winnings = amount * 2;
    user.credits += winnings;
    message = `🪙 The coin landed on **${result.toUpperCase()}!**\nYou won **${winnings} credits!** 🎉`;
    color = 0x00ff99;
  } else {
    user.credits -= amount;
    message = `🪙 The coin landed on **${result.toUpperCase()}!**\nYou lost **${amount} credits.** 😢`;
    color = 0xff3333;
  }

  saveUsers(users);

  const embed = new EmbedBuilder()
    .setTitle("Coin Flip Result")
    .setDescription(message)
    .addFields(
      { name: "Your Choice", value: choice, inline: true },
      { name: "Result", value: result, inline: true },
      { name: "Current Credits", value: `${user.credits}`, inline: true }
    )
    .setColor(color)
    .setImage(`attachment://${result === "head" ? "march7th_head.png" : "evernight_tail.png"}`);

  await interaction.reply({ embeds: [embed], files: [imageFile] });
}
