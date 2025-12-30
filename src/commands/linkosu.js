import { loadUsers, linkosu } from "../../data/userdata.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

const API_BASE_URL = process.env.API_BASE_URL;

export const command = new SlashCommandBuilder()
    .setName("linkosu")
    .setDescription("Link your Osu! Profile with Evernight");

export async function execute(interaction) {
   
    await interaction.deferReply({ ephemeral: true });

    const users = loadUsers();
    const userId = interaction.user.id;

    if (!users[userId]) {
        return interaction.editReply("You don't have an account, please use /register");
    }

    try {
        const res = await fetch(`${API_BASE_URL}/osu/link?userId=${userId}`);
        if (!res.ok) {
            throw new Error("VPS Error");
        }
        const data = await res.json();
        const embed = new EmbedBuilder()
            .setColor(0xFF66AA)
            .setTitle("Connect your osu account")
            .setDescription(`[Click here to login with your osu account](${data.url})`)
            .setThumbnail("https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Osu%21_Logo_2016.svg/1200px-Osu%21_Logo_2016.svg.png");
        await interaction.editReply({ embeds: [embed] });
        let attempts = 0;
        const maxAttempts = 60; 
        const checkInterval = setInterval(async () => {
            attempts++;
            try {
                const checkRes = await fetch(`${API_BASE_URL}/osu/retrieve/${userId}`);
                const checkData = await checkRes.json();

                if (checkData.success) {
                    
                    clearInterval(checkInterval);
                    linkosu(userId, checkData.data);

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle("Linked Successfully!")
                        .setDescription(`Connected as **${checkData.data.username}**!`)
                        .setThumbnail(checkData.data.avatar || checkData.data.cover);
                    await interaction.editReply({ embeds: [successEmbed] });
                }
            } catch (err) {
                // Ignore errors while polling
            }
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                await interaction.editReply({ content: "You took too long that March7th has frozen again", embeds: [] });
            }
        }, 2000);
    } catch (err) {
        console.error(err);
        await interaction.editReply("Something went wrong connecting to the server.");
    }
}