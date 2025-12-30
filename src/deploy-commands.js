import { REST, Routes } from "discord.js";
import "dotenv/config";
import { command as register } from "./commands/register.js";
import { command as profile } from "./commands/profile.js";
import { command as bet } from "./commands/bet.js";
import { command as daily } from "./commands/daily.js";
import { command as leaderboard } from "./commands/leaderboard.js";
import { command as gen } from "./commands/gen.js";
import { command as help } from "./commands/help.js";
import { command as gacha } from "./commands/gacha.js";
import { command as inventory } from "./commands/inventory.js";
import {command as ask} from "./commands/ask.js"
import {command as blackjack} from "./commands/blackjack.js"
import {command as adventure} from "./commands/adventure.js"
import {command as shop} from "./commands/shop.js"
import {command as linkgithub} from  "./commands/linkgithub.js"
// import {command as recent} from "./commands/recent.js"

const commands = [register, profile, bet, daily, leaderboard, gen, help, gacha,linkgithub, inventory, ask, blackjack, adventure, shop].map(cmd =>
  cmd.toJSON()
);

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
const clientId = process.env.CLIENT_ID;


const guilds = [process.env.GUILD_ID, "941190868235333692"];

(async () => {
  try {
    for (const guildId of guilds) {
      console.log(`Registering commands in guild ${guildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`Commands registered in guild ${guildId}`);
    }

    console.log("Registering global commands (optional)...");
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log("Global commands registered (may take up to 1 hour)");
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
})();
