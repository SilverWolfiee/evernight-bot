import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import pkg from "@napi-rs/canvas";
const { createCanvas, loadImage } = pkg;

export const command = new SlashCommandBuilder()
  .setName("gen")
  .setDescription("Generate a demotivator meme")
  
  .addAttachmentOption((option) =>
    option.setName("image").setDescription("Attach an image").setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("text").setDescription("Text to display").setRequired(true)
  )

export async function execute(interaction) {
  await interaction.deferReply();
  try {
    const text = interaction.options.getString("text");
    const attachment = interaction.options.getAttachment("image");

    const imageUrl = attachment?.url ?? "https://picsum.photos/800/600";
    let img;
      try {
        img = await loadImage(imageUrl);
      } catch (e) {
        console.error("❌ Failed to load image:", e);
        return await interaction.editReply("Failed to load image.");
      };

    const canvas = createCanvas(800, 900);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 50, 700, 600);
    ctx.drawImage(img, 60, 60, 680, 580);

    ctx.font = "bold 46px Georgia";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const maxWidth = 700;
    const lineHeight = 50;
    const words = text.split(" ");
    let line = "";
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    const textY = 750 - (lines.length - 1) * (lineHeight / 2);
    lines.forEach((l, i) => {
      ctx.fillText(l, canvas.width / 2, textY + i * lineHeight);
    });

    const buffer = canvas.toBuffer("image/png");
    const meme = new AttachmentBuilder(buffer, { name: "demotivator.png" });

    await interaction.editReply({ files: [meme] });
  } catch (err) {
    console.error("Error in /gen command:", err);
    await interaction.editReply("An error occurred while generating the meme.");
  }
}
