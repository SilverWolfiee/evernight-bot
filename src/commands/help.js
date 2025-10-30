import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";

export const command = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Guide to all Commands in Evernight")

export async function execute(interaction) {
    const profileImage = new AttachmentBuilder("./assets/evernight_profile.png");
    const embed = new EmbedBuilder()
        .setColor("#a90000")
        .setTitle("Guide to Evernight-bot")
        .setDescription("All available commands")
        .addFields(
            {name : "/bet", value : "Bet on heads on tails with your credits", inline : false},
            {name : "/Daily", value : "Claim your Daily reward once every 24 Hours", inline : false},
            {name : "/leaderboard", value : "See Local/Global leaderboard", inline : false},
            {name : "/Profile", value : "See your Evernight Profile", inline : false},
            {name : "/Register", value : "Create Evernight Account", inline : false},
            {name : "/Inventory", value : "Check your Lightcone/Character Invontory", inline : false},
            {name : "/Gacha", value : "Embrace your thirst of gacha", inline : false},
            {name : "/Gen", value : "Generate a demotivator meme", inline : false},
            {name : "/Blackjack", value : "Play Blackjack with Evernight(Multiplayer is still WIP)", inline : false},
            
        )
        
        .setFooter({text : "♭ I know your past, the things you want to see ♭, to touch ♭, to know ♭"})
        .setTimestamp()
        .setThumbnail("attachment://evernight_profile.png")
       await interaction.reply({ embeds: [embed] , files: [profileImage]});
    
}