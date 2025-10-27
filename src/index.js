import { Client, GatewayIntentBits, Collection } from "discord.js";
import 'dotenv/config';
import fs from "fs";
import path from "path";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();


const commandFiles = fs.readdirSync("./src/commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const { command, execute } = await import(`./commands/${file}`);
  client.commands.set(command.name, { command, execute });
}

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (cmd) {
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ An error occurred.", ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
