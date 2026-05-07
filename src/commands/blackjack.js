// blackjack.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { loadUsers } from "../../data/userdata.js";

export const command = new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play Blackjack with Evernight!")
    .addIntegerOption(option =>
        option.setName("jades")
            .setDescription("The amount of Stellar Jades you want to bet")
            .setRequired(true)
            .setMinValue(1)
    );

export async function execute(interaction) {
    const users = await loadUsers();
    const user = users[interaction.user.id];
    const bet = interaction.options.getInteger("jades");

    if (!user) {
        await interaction.reply({
            content: "Wait! You need an account first! Use /register so we can keep track of your Jades!",
            ephemeral: true,
        });
        return;
    }

    if (user.jades < bet) {
        await interaction.reply({
            content: `Aww, you don't have enough Jades! You only have ${user.jades} Stellar Jades left.`,
            ephemeral: true,
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle("Evernight Blackjack")
        .setDescription(`Ready to bet **${bet}** Stellar Jades?`)
        .setColor("Purple");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
    
            .setCustomId(`bj_start_${bet}`) 
            .setLabel("Deal the Cards!")
            .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}