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
            content: "Please create an account with /register first",
            ephemeral: true,
        });
        return;
    }

    if (user.jades < bet) {
        await interaction.reply({
            content: `Aww, you don't have enough Jades for that bet! You only have ${user.jades} Jades left.`,
            ephemeral: true,
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle("Evernight Blackjack")
        .setDescription(`Your bet : **${bet}**`)
        .setColor("Purple")
        

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("bj_start")
            .setLabel("Deal the Cards!")
            .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}