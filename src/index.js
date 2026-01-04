import { Client, GatewayIntentBits, Collection } from "discord.js";
import 'dotenv/config';
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { splitMessage } from "./utils/splitMessage.js";
import { autoRegeneratePower } from "./utils/power.js";
import { loadUsers } from "../data/userdata.js";
import { battleInteraction } from "./utils/battle_mgr.js";



const ASK_LOG_PATH = path.join(process.cwd(), "data", "ask_messages.json");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(process.cwd(), "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const imported = await import(`file:///${filePath.replace(/\\/g, '/')}`);
    const command = imported.command;
    const execute = imported.execute;

    if (!command?.name || typeof execute !== "function") {
      console.warn(`Skipping invalid command file: ${file}`);
      continue;
    }

    client.commands.set(command.name, { command, execute });
    console.log(`Loaded command: ${command.name}`);
  } catch (err) {
    console.warn(`Failed to load command: ${file}`);
    console.warn(`→ ${err.message}`);
  }
}


client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  autoRegeneratePower();
});


client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (cmd) {
      try {
        await cmd.execute(interaction);
      } catch (err) {
        console.error(err);
        if (!interaction.replied) {
          await interaction.reply({ content: "An error occurred.", ephemeral: true });
        }
      }
    }
    return; 
  }

  if (interaction.isButton() && interaction.customId.startsWith("bj_")) {
    const { handleBlackjackButton } = await import("./utils/blackjackGame.js");
    return await handleBlackjackButton(interaction);
  }
  if (interaction.isButton() && ["atk","skill","ult","run"].includes(interaction.customId)) {
    const { handleBattleButton } = await import("../data/battle.js"); 
    return handleBattleButton(interaction)
  }
  await battleInteraction(interaction);
});


process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    const res = await fetch("https://api.chatguard.cedrugs.app/v1/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message.content,
        treshold: 0.5,
      }),
    });

    const data = await res.json();
    console.log("Loaded Cedrugs's chatguard");
    if (data.label === "toxic") {
      const offend = message.content
      try {
        await message.delete();
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
      await message.channel.send({
      embeds: [{
          title: "Message Removed",
          description: `A message from **${message.author.tag}** was removed for violating chat rules.`,
          color: 0xff4d4d,
          footer: { text: "Chat Moderation by Evernight" }
        }]
      });
      try {
      await message.author.send({
        embeds: [{
          title: "⚠️ Evernight Moderation Alert!",
          description:
            "Hey!! I noticed your message was a bit too harsh, so I had to take it down.\n\n" +
            "**Here’s what you sent:**\n" +
            `> ${offend}\n\n` +
            "Try to keep things friendly next time, okay Trailblazer?",
          color: 0x8B0000
        }]
      });
    } catch (err) {
      console.error("DM failed:", err);
    }
      return; 
    }
  } catch (err) {
    console.error("chatguard error", err);
  }

  if (!message.reference) return;

  const repliedId = message.reference.messageId;
  if (!fs.existsSync(ASK_LOG_PATH)) return;

  const data = JSON.parse(fs.readFileSync(ASK_LOG_PATH, "utf8"));
  let askData = data[repliedId];

  if (!askData) {
    for (const [id, entry] of Object.entries(data)) {
      if (entry.followUps?.some(f => f.followUpMessageId === repliedId)) {
        askData = entry;
        break;
      }
    }
  }

  if (!askData) return;
  if (message.author.id !== askData.user) return;

  const userReply = message.content;
  const followUp = await generateFollowUpResponses(askData.query, userReply);

  const parts = splitMessage(followUp);

  for (const part of parts) {
    try {
      if (part.length > 2000) {
        await message.reply({
          content: "Ughh, that’s too long to say all at once... I’ll skip the rest, Trailblazer~",
          allowedMentions: { repliedUser: false },
        });
        break;
      }
      const replyMsg = await message.reply({
        content: part,
        allowedMentions: { repliedUser: false },
      });

      askData.followUps = askData.followUps || [];
      askData.followUps.push({
        userReply,
        followUp,
        followUpMessageId: replyMsg.id,
      });
      fs.writeFileSync(ASK_LOG_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error sending message part:", err);
      await message.reply({
        content: "Eep! My message broke Discord’s limit again. I’ll stop before Mr. Yang scolds me!",
        allowedMentions: { repliedUser: false },
      });
      break;
    }
  }
  
});

async function generateFollowUpResponses(originalQuery, userReply) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
                    You are Evernight, an alter persona of March 7th from Honkai: Star Rail!
                    Stay cheerful, energetic, and curious — like you're chatting with a fellow Trailblazer.
                    Original question: ${originalQuery}
                    User replied: ${userReply}
                  `,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "Evernight tilts her head, thinking... but nothing comes to mind right now.";
  } catch (err) {
    console.error("Follow-up error:", err);
    return "Evernight is frozen in Amphoreus — she can’t answer that right now!";
  }
}
loadUsers()
client.login(process.env.DISCORD_TOKEN);
