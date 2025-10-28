import { REST, Routes } from "discord.js";
import "dotenv/config";

// Import commands
import { command as register } from "./commands/register.js";
import { command as profile } from "./commands/profile.js";
import { command as bet } from "./commands/bet.js";
import { command as daily } from "./commands/daily.js";
import { command as leaderboard } from "./commands/leaderboard.js";
import { command as gen } from "./commands/gen.js";
import {command as help} from "./commands/help.js"

const commands = [register, profile, bet, daily, leaderboard, gen, help].map(cmd =>
  cmd.toJSON()
);


const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; 

(async () => {
  try {
    console.log("Registering GUILD (local) commands...");
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log("Guild commands registered instantly!");

    console.log("Registering GLOBAL commands...");
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log("Global commands registered (may take up to 1 hour to update).");
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
})();
