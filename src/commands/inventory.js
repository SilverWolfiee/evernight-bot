import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getInventory } from "../utils/inventory_mgr.js";
import pkg from "@napi-rs/canvas";
import path from "path";
import fs from "fs";
const { createCanvas, loadImage } = pkg;

const TILE_SIZE = 640;
const TILES_PER_ROW = 5;
const ITEMS_PER_PAGE = 10;

export const command = new SlashCommandBuilder()
  .setName("inventory")
  .setDescription("View your inventory");

export async function execute(interaction) {
  const inventory = getInventory(interaction.user.id);
  if (!inventory || !inventory.characters || Object.keys(inventory.characters).length === 0) {
    await interaction.reply({ content: "You don't have any characters yet!", ephemeral: true });
    return;
  }

  const characters = Object.entries(inventory.characters);
  let page = 1;
  const totalPages = Math.ceil(characters.length / ITEMS_PER_PAGE);

  await interaction.deferReply(); // defer first

  async function generatePage(pageNumber) {
    const start = (pageNumber - 1) * ITEMS_PER_PAGE;
    const pageCharacters = characters.slice(start, start + ITEMS_PER_PAGE);

    const rows = Math.ceil(pageCharacters.length / TILES_PER_ROW);
    const canvasWidth = TILE_SIZE * TILES_PER_ROW;
    const canvasHeight = TILE_SIZE * rows + 80;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < pageCharacters.length; i++) {
      const [name, count] = pageCharacters[i];
      const row = Math.floor(i / TILES_PER_ROW);
      const col = i % TILES_PER_ROW;
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      const filePath = path.join("./assets/character", `${name}.png`);
      if (fs.existsSync(filePath)) {
        const img = await loadImage(filePath);
        ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);

     
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 6;
        ctx.font = "bold 50px Arial";
        ctx.textAlign = "center";
        ctx.strokeText(name, x + TILE_SIZE / 2, y + 50);
        ctx.fillText(name, x + TILE_SIZE / 2, y + 50);

     
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "right";
        ctx.strokeText(`x${count}`, x + TILE_SIZE - 20, y + TILE_SIZE - 20);
        ctx.fillText(`x${count}`, x + TILE_SIZE - 20, y + TILE_SIZE - 20);
      } else {
        console.warn(`Image not found for character: ${name}`);
      }
    }

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: `inventory_page_${pageNumber}.png` });
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Characters (Page ${pageNumber}/${totalPages})`)
      .setColor("#a90000")
      .setImage(`attachment://inventory_page_${pageNumber}.png`)
      .setTimestamp();

    return { embed, attachment };
  }

  const { embed, attachment } = await generatePage(page);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("prev").setLabel("⬅ Previous").setStyle(ButtonStyle.Primary).setDisabled(page === 1),
    new ButtonBuilder().setCustomId("next").setLabel("Next ➡").setStyle(ButtonStyle.Primary).setDisabled(page === totalPages)
  );

  const msg = await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 5 * 60 * 1000 });

  collector.on("collect", async (btnInt) => {
    if (btnInt.user.id !== interaction.user.id) {
      await btnInt.reply({ content: "Only the command user can use these buttons.", ephemeral: true });
      return;
    }

    await btnInt.deferUpdate();

    if (btnInt.customId === "next" && page < totalPages) page++;
    if (btnInt.customId === "prev" && page > 1) page--;

    const { embed, attachment } = await generatePage(page);

    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅ Previous").setStyle(ButtonStyle.Primary).setDisabled(page === 1),
      new ButtonBuilder().setCustomId("next").setLabel("Next ➡").setStyle(ButtonStyle.Primary).setDisabled(page === totalPages)
    );

    await btnInt.editReply({ embeds: [embed], files: [attachment], components: [updatedRow] });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅ Previous").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("next").setLabel("Next ➡").setStyle(ButtonStyle.Primary).setDisabled(true)
    );
    await interaction.editReply({ components: [disabledRow] });
  });
}
