import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
const API_BASE_URL = process.env.API_BASE_URL;
export const command = new SlashCommandBuilder()
    .setName('fnafmml')
    .setDescription('Get your fnaf mml profile if you are a maxmode player')
    .addStringOption(option=>
        option.setName('username')
            .setDescription('your MML username(case-insensitive)')
            .setRequired(true)
    )

export async function execute(interaction){
    const username = interaction.options.getString('username')
    await interaction.deferReply()
    try{
        const response = await fetch(`${API_BASE_URL}/fnafmml/profile/${username}`)
        if(!response.ok){
            return interaction.editReply({ content: `Couldn't find profile for **${username}**.` });
        }
        const data = await response.json();
        const { profile, mlRank, ulRank } = data;

        
        const avatarUrl = `https://sfuturtuydlyapodjymn.supabase.co/storage/v1/object/public/user-avatars/${profile.avatar_path}`;

        const embed = new EmbedBuilder()
            .setColor('#FF0055') 
            .setTitle(`${profile.display_name}'s FNAF Stats`)
            .setURL(`https://fnafmml.com/profile/${profile.username}`)
            .setThumbnail(avatarUrl)
            .addFields(
                { name: 'Bio', value: profile.bio || 'No bio set.' },
                { name: 'Country', value: `:flag_${profile.country.toLowerCase()}: ${profile.country}`, inline: true },
                { name: 'Role', value: profile.role, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, 
                { name: 'ML Rank', value: `\`#${mlRank}\``, inline: true },
                { name: 'UL Rank', value: `\`#${ulRank}\``, inline: true }
            )
            .setFooter({ text: 'HAR HAR HAR HAR HAR HAR HAR HAR HAR HAR', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
    catch(error){
        console.error(error);
        await interaction.editReply({ content: 'Elysia is sleeping(Backend error)' });
    }
}