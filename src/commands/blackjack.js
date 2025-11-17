import {SlashCommandBuilder,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle} from "discord.js";

import { loadUsers } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play Blackjack with Evernight or your friends");

export async function execute(interaction) {
    const users = await loadUsers();
    const user = users[interaction.user.id];
    if (!user) {
        await interaction.reply({
            content: "Please create an account using /register",
            ephemeral: true,
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle("Evernight Blackjack(Multiplayer WIP)")
        .setDescription("Choose your mode:")
        .setColor("Purple");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("bj_single")
            .setLabel("Singleplayer")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("bj_multi")
            .setLabel("Multiplayer")
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}
