import { REST, Routes } from "discord.js";
import 'dotenv/config';
import { command as register } from './commands/register.js';
import { command as profile } from './commands/profile.js';
import { command as bet } from './commands/bet.js';
import { command as daily } from './commands/daily.js';

const commands = [register, profile, bet, daily].map(cmd => cmd.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Registering global commands...');
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID), 
    { body: commands }
  );
  console.log('✅ Global commands registered! (May take up to 1h to appear)');
} catch (err) {
  console.error(err);
}
