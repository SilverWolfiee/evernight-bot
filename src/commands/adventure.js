import { 
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} from "discord.js";

import { loadUsers, saveUsers, checkUser } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
    .setName("adventure")
    .setDescription("Consume 30 power to go on an adventure");

export async function execute(interaction) {
    const userId = interaction.user.id;
    const users = loadUsers();

    checkUser(userId, users);

    const user = users[userId];


    if (!user.rpg) {
        user.rpg = { hp: user.stats.maxHp, atk: user.stats.atk, def: user.stats.def };
    }
    if (!user.session) {
        user.session = {
            inBattle: false,
            difficulty: null,
            enemy: null,
        };
    }

    if (user.power < 30) {
        return interaction.reply({
            content: "You don't have enough power, take a rest Trailblazer!",
            ephemeral: true
        });
    }

    
    user.lastPowerUpdate = Date.now();
    saveUsers(users);

   
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("adv_difficulty_" + userId)
        .setPlaceholder("Choose your difficulty")
        .addOptions([
            { label: "Easy", value: "easy" },
            { label: "Medium", value: "medium" },
            { label: "Hard", value: "hard" }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
        content: "Choose your adventure difficulty!",
        components: [row]
    });
}
