import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from "discord.js";
import pkg from "@napi-rs/canvas";
const { createCanvas, loadImage } = pkg;
import { loadUsers, saveUsers } from "../../data/userdata.js";
import fs from "fs";

const featuredFiveStar = "Evernight";

const fiveStars = [
  "Acheron","Argenti","Aglaea","Anaxa","Archer","Aventurine","Bailu","Black Swan","Blade",
  "Boothill","Bronya","Castorice","Cerydra","Cipher","Clara","Cyrene","Dan Heng Imbibitor Lunae",
  "Dan Heng Permansor Terrae","Dr. Ratio","Evernight","Feixiao","Firefly","Fugue","Fu Xuan",
  "Himeko","Huo Huo","Hyacine","Hysilens","Jade","Jiaoqiu","Jing Liu","Jing Yuan","Kafka",
  "Lingsha","Luocha","Mydei","Phainon","Rappa","Robin","Ruan Mei","Saber","Seele","Silver Wolf",
  "Sparkle","Sunday","Topaz","Tribbie","The Herta","Welt","Yanqing","Yunli"
];

const fourStars = [
  "Arlan","Asta","Dan Heng","Gallagher","Guinaifen","Hanya","Herta","Hook","Lynx",
  "March 7th(Preservation)","Misha","Moze","Natasha","Pela","Qingque",
  "Serval","Sampo","Tingyun","Xueyi","Yukong"
];

function getFiveStarRate(gacha_count) {
  if (gacha_count >= 90) return 1.0;
  if (gacha_count < 74) return 0.006;
  const excess = gacha_count - 73;
  return 0.006 + (0.994 / 17) * excess;
}

function getFourStarRate(gacha_count) {
  if (gacha_count % 10 === 0) return 1.0;
  return 0.051;
}

export const command = new SlashCommandBuilder()
  .setName("gacha")
  .setDescription("Satisfy your gambling thirst")
  .addStringOption(opt =>
    opt.setName("type")
      .setDescription("Choose what to pull: character or lightcone")
      .setRequired(true)
      .addChoices(
        { name: "Character", value: "character" },
        { name: "Light Cone", value: "lightcone" }
      )
  )
  .addIntegerOption(opt =>
    opt.setName("amount")
      .setDescription("Number of pulls (1-10)")
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(true)
  );

// helper functions for inventory
function addCharacterToInventory(user, characterName) {
  if (!user.inventory) user.inventory = { characters: {}, lightCones: {} };
  if (!user.inventory.characters[characterName]) user.inventory.characters[characterName] = 0;
  user.inventory.characters[characterName] += 1;
}

function addLightConeToInventory(user, lightConeName) {
  if (!user.inventory) user.inventory = { characters: {}, lightCones: {} };
  if (!user.inventory.lightCones[lightConeName]) user.inventory.lightCones[lightConeName] = 0;
  user.inventory.lightCones[lightConeName] += 1;
}

export async function execute(interaction) {
  const type = interaction.options.getString("type");
  const amount = interaction.options.getInteger("amount");
  if (type === "lightcone") {
  await interaction.reply({ content: "Light Cone gacha is not available yet, Work in progress", ephemeral: true });
  return;
}
  const users = loadUsers();
  const user = users[interaction.user.id];

  if (!user) {
    await interaction.reply({ content: "Please create an account using /register", ephemeral: true });
    return;
  }

  const cost = 160 * amount;
  if (user.jades < cost) {
    const stickerImage = new AttachmentBuilder("./assets/evernight_tail.png");
    await interaction.reply({
      content: "💸 Aww you're too poor!",
      files: [stickerImage],
    });
    return;
  }

  await interaction.deferReply();

  user.jades -= cost;
  user.pity = user.pity ?? 0;
  user.fourStarPity = user.fourStarPity ?? 0;
  user.guaranteedFeatured = user.guaranteedFeatured ?? false;

  const pulls = [];
  let highestRarity = 3;

  for (let i = 0; i < amount; i++) {
    user.pity++;
    user.fourStarPity++;

    const fiveRate = getFiveStarRate(user.pity);
    const fourRate = getFourStarRate(user.fourStarPity);
    const roll = Math.random();

    let rarity;
    let item;

    if (roll < fiveRate) {
      rarity = 5;
      user.pity = 0;

      if (user.guaranteedFeatured) {
        item = featuredFiveStar;
        user.guaranteedFeatured = false;
      } else if (Math.random() < 0.5) {
        item = featuredFiveStar;
        user.guaranteedFeatured = false;
      } else {
        const otherFiveStars = fiveStars.filter(f => f !== featuredFiveStar);
        item = otherFiveStars[Math.floor(Math.random() * otherFiveStars.length)];
        user.guaranteedFeatured = true;
      }

      if (type === "character") addCharacterToInventory(user, item);
      else addLightConeToInventory(user, item);

    } else if (roll < fiveRate + fourRate || user.fourStarPity >= 10) {
      rarity = 4;
      user.fourStarPity = 0;
      item = fourStars[Math.floor(Math.random() * fourStars.length)];

      if (type === "character") addCharacterToInventory(user, item);
      else addLightConeToInventory(user, item);

    } else {
      rarity = 3;
      item = "Meshing Cogs";
    }

    pulls.push({ rarity, item });
    if (rarity > highestRarity) highestRarity = rarity;
  }

  saveUsers(users);

  const images = [];
  for (const p of pulls) {
    let safeName = p.item.replace(/[^a-zA-Z0-9_\- ]/g, "");
    let filename = type === "character"
      ? `./assets/character/${safeName}.png`
      : `./assets/lightcone/${safeName}.png`;

    if (p.item.toLowerCase().includes("meshing cogs")) filename = "./assets/lightcone/meshingcogs.png";
    if (!fs.existsSync(filename)) filename = "./assets/character/Evernight.png";

    images.push({ path: filename, rarity: p.rarity });
  }

  const tileSize = 640;
  const cols = 5;
  const rows = Math.ceil(images.length / cols);
  const width = cols * tileSize;
  const height = rows * tileSize;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let x = 0, y = 0;
  for (const img of images) {
    const charImg = await loadImage(img.path);
    ctx.drawImage(charImg, x, y, tileSize, tileSize);
    ctx.lineWidth = 20;
    ctx.shadowBlur = 60;
    ctx.shadowColor = img.rarity === 5 ? "#FFD700" : img.rarity === 4 ? "#AA6CFF" : "#AAAAAA";
    ctx.strokeStyle = ctx.shadowColor;
    ctx.strokeRect(x + 10, y + 10, tileSize - 20, tileSize - 20);
    x += tileSize;
    if (x >= width) { x = 0; y += tileSize; }
  }

  const buffer = canvas.toBuffer("image/png");
  const file = new AttachmentBuilder(buffer, { name: "gacha_result.png" });

  const results = pulls.map(p => `${p.rarity}★ ${p.item}`).join("\n");
  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.username}'s ${amount}× ${type} pulls`)
    .setDescription(results)
    .setColor(highestRarity === 5 ? 0xFFD700 : highestRarity === 4 ? 0xAA6CFF : 0xAAAAAA)
    .setImage("attachment://gacha_result.png")
    .setFooter({ text: `Remaining Jades: ${user.jades} | Pity: ${user.pity}` });

  await interaction.editReply({ embeds: [embed], files: [file] });
}
