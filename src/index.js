import { Client, GatewayIntentBits, Collection } from "discord.js";
import 'dotenv/config';
import fs from "fs";
import path from "path";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  
});

client.commands = new Collection();


const commandsPath = path.join(process.cwd(), "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));


for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const imported = await import(`file:///${filePath.replace(/\\/g, '/')}`);
  const command = imported.command;
  const execute = imported.execute;

  if (!command?.name) {
    console.warn(`⚠️ Skipping invalid command file: ${file}`);
    continue;
  }

  client.commands.set(command.name, { command, execute });
}


client.once("clientReady", () => console.log(`Logged in as ${client.user.tag}`));

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
});
process.on('unhandledRejection', (err) => {
  console.error("Unhandled promise rejection:", err);
});
client.login(process.env.DISCORD_TOKEN);
