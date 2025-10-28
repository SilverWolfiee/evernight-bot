import { SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import fetch from "node-fetch";
import { loadUsers, saveUsers } from "../../data/userdata.js";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
});

const MONTHLY_TOKEN_BUDGET = 2500000;
const CURRENT_MONTH = new Date().getMonth();

function splitMessage(text, limit = 2000) {
  const chunks = [];
  let buffer = "";
  const lines = text.split("\n");
  for (const line of lines) {
    if (buffer.length + line.length + 1 > limit) {
      chunks.push(buffer);
      buffer = "";
    }
    buffer += (buffer ? "\n" : "") + line;
  }
  if (buffer) chunks.push(buffer);

  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= limit) {
      finalChunks.push(chunk);
      continue;
    }
    let temp = "";
    const words = chunk.split(/(\s+)/);
    for (const word of words) {
      if (temp.length + word.length > limit) {
        finalChunks.push(temp.trimEnd());
        temp = "";
      }
      temp += word;
    }
    if (temp) finalChunks.push(temp.trimEnd());
  }

  for (let i = 0; i < finalChunks.length; i++) {
    const countTicks = (finalChunks[i].match(/```/g) || []).length;
    if (countTicks % 2 !== 0) {
      finalChunks[i] += "\n```";
      if (i + 1 < finalChunks.length && !finalChunks[i + 1].startsWith("```")) {
        finalChunks[i + 1] = "```\n" + finalChunks[i + 1];
      }
    }
  }
  return finalChunks;
}

async function safeRequest(prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.chat.completions.create(prompt);
    } catch (err) {
      if (err.status >= 500 && i < retries - 1) {
        console.warn(`Evernight retrying request... (${i + 1})`);
        await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

// 🔍 Web search function using SerpAPI
async function searchWeb(query) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return "⚠️ Web search unavailable — missing SERPAPI_KEY in .env file.";
  }

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.organic_results?.length) return "No relevant results found.";

  const results = data.organic_results
    .slice(0, 5)
    .map(
      (r, i) =>
        `${i + 1}. **${r.title || "Untitled"}**\n${r.snippet || ""}\n${r.link}`
    )
    .join("\n\n");

  return `🌐 Here's what I found on the web:\n\n${results}`;
}

export const command = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Ask Evernight a question")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("Your question to Evernight")
      .setRequired(true)
  );

export async function execute(interaction) {
  const query = interaction.options.getString("query");
  const users = loadUsers();
  const user = users[interaction.user.id];

  if (!user) {
    await interaction.reply({
      content: "Please create an account using /register",
      ephemeral: true,
    });
    return;
  }

  user.tokens = user.tokens ?? {};
  if (user.tokens.month !== CURRENT_MONTH) {
    user.tokens.month = CURRENT_MONTH;
    user.tokens.used = 0;
  }

  if (user.tokens.used >= MONTHLY_TOKEN_BUDGET) {
    await interaction.reply({
      content:
        "Evernight's mind is resting. The monthly token budget has been reached.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const shouldSearchWeb = /search|look up|find|google/i.test(query);
  let answer = "";

  try {
    if (shouldSearchWeb) {
      await interaction.editReply("🔎 Evernight is searching the web...");
      answer = await searchWeb(query.replace(/^(search|look up|find)\s+/i, ""));
    } else {
      const response = await safeRequest({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: "You are a helpful assistant named Evernight." },
          { role: "user", content: query },
        ],
      });
      answer = response.choices[0].message.content;
      const totalTokens = response.usage?.total_tokens ?? 0;
      user.tokens.used += totalTokens;
      saveUsers(users);
    }

    const header = `<@${interaction.user.id}> asked:\n>> ${query}\n`;
    const fullResponse = `${header}\n${answer}`;
    const parts = splitMessage(fullResponse);
    await interaction.editReply(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      await new Promise((r) => setTimeout(r, 500));
      await interaction.followUp(parts[i]);
    }
  } catch (err) {
    console.error(err);

    if (err.status === 429 || err.status === 400 || err.status === 401) {
      await interaction.editReply(
        "Evernight's connection is cut — the API key may be rate-limited or out of funds."
      );
    } else if (err.status === 503 || err.status >= 500) {
      await interaction.editReply(
        "Evernight’s mind is clouded... the API seems temporarily unreachable. Try again soon."
      );
    } else {
      await interaction.editReply(
        "Evernight is too dumb to answer that right now. (Unexpected error)"
      );
    }
  }
}
