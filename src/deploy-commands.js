import { REST, Routes } from "discord.js";
import 'dotenv/config';
import { command as register } from './commands/register.js';
import { command as profile } from './commands/profile.js';

const commands = [register, profile].map(cmd => cmd.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('🔄 Registering commands...');
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('Commands registered.');
} catch (err) {
  console.error(err);
}
//auto generated