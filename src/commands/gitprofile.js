import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export const command = new SlashCommandBuilder()
    .setName("gitprofile")
    .setDescription("Flex your git profile on this server")

export async function execute(interaction) {
    const userId = interaction.user.id;
    await interaction.deferReply()
    try{
        const res = await fetch(`http://localhost:21000/user/${userId}`)
        if(res.status===404){
            return interaction.editReply({content : "I've checked my database and i can't seem to find you"})
        }
        if(!res.ok){
            throw new Error (`Elysia Responded with : ${res.status}`)
        }
        const userdata = await res.json()
        if (!userdata.github || !userdata.github.username) {
            return interaction.editReply({
                content: "Hey! You haven't linked your GitHub yet!"
            });
        }
        const {username} = userdata.github
        const githubres = await fetch(`https://api.github.com/users/${username}`)
        if(!githubres.ok){
            return interaction.editReply("Github didn't respond to me")
        }
        const gitProfile = await githubres.json()
        const embed = new EmbedBuilder()
        .setColor('#b52700') 
            .setTitle(`${gitProfile.name || gitProfile.login}'s GitHub Profile`)
            .setURL(gitProfile.html_url)
            .setThumbnail(gitProfile.avatar_url)
            .setDescription(gitProfile.bio || "No bio set... Even i wasn't this Mysterious!")
            .addFields(
                { name: 'Repos', value: `${gitProfile.public_repos}`, inline: true },
                { name: 'Followers', value: `${gitProfile.followers}`, inline: true },
                { name: 'Following', value: `${gitProfile.following}`, inline: true },
                { name: 'Joined', value: `<t:${Math.floor(new Date(gitProfile.created_at).getTime() / 1000)}:R>`, inline: false }
            )
            .setFooter({ text: "Evernight's Database • Obtained via Elysia" })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error("Error in gitprofile:", error);
       
        await interaction.editReply({ content: "Oops! Something tripped me up while fetching your data. Try again later!" });
    }
    
    
}