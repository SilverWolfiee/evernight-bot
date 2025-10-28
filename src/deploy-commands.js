import { REST, Routes } from "discord.js";
import "dotenv/config";
import { command as register } from "./commands/register.js";
import { command as profile } from "./commands/profile.js";
import { command as bet } from "./commands/bet.js";
import { command as daily } from "./commands/daily.js";
import { command as leaderboard } from "./commands/leaderboard.js";

const commands = [register, profile, bet, daily, leaderboard].map(cmd => cmd.toJSON());
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const clientId = process.env.CLIENT_ID;

(async () => {
  try {
    console.log("Registering global commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Global commands registered (may take up to 1 hour to update).");
  } catch (err) {
    console.error("Failed to register global commands:", err);
  }
})();
