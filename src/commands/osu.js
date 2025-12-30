import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadUsers} from "../../data/userdata.js";


export const command = new SlashCommandBuilder()
    .setName("osu")
    .setDescription("view your osu profile")
    .addStringOption(option =>
        option.setName("gamemode")
        .setDescription("Select the gamemode to view")
        .setRequired(false)
        .addChoices(
            {name : 'Standard', value : 'osu'},
            {name : 'Taiko', value : 'taiko'},
            {name : 'Catch', value : 'fruits'},
            {name : 'Mania', value : 'mania'}
        )
    )
export async function execute(interaction){
    try {
    const users = loadUsers();
    const userId = interaction.user.id;
    const user = users[userId];

    // 1. Check if linked
    if (!user || !user.osu) {
      return interaction.reply({
        content: "🚫 **No osu! account found!**\nPlease use `/linkosu` to connect your profile first!",
        ephemeral: true
      });
    }

    const osu = user.osu;
    const selectedMode = interaction.options.getString("gamemode") || osu.mode || 'osu';

    // 2. Country Logic (Amphoreus or Earth?) 🌍
    let flag = "🌍";
    let countryName = "Amphoreus"; // HSR Reference! 🏛️

    if (osu.country) {
     
      flag = `:flag_${osu.country.toLowerCase()}:`;
      countryName = osu.country; 
    }

    
    const modeIcons = {
      osu: "🔴",
      taiko: "🥁",
      fruits: "🍎",
      mania: "🎹"
    };
    const modeIcon = modeIcons[selectedMode] || "🔴";

    // 4. Build the Card
    const embed = new EmbedBuilder()
      .setColor(0xFF66AA) // osu! Pink
      .setTitle(`${modeIcon} ${osu.username}'s Profile`)
      .setURL(`https://osu.ppy.sh/users/${osu.id}`)
      .setThumbnail(osu.avatar)
      .setImage(osu.cover) 
      .addFields(
        { name: "🌍 Country", value: `${flag} **${countryName}**`, inline: true },
        { name: "🏆 Global Rank", value: `#${osu.globalRank?.toLocaleString() || "N/A"}`, inline: true },
        { name: "🏅 Country Rank", value: `#${osu.countryRank?.toLocaleString() || "N/A"}`, inline: true }, // *See note below
        { name: "✨ PP", value: `${Math.round(osu.pp || 0).toLocaleString()}`, inline: true },
        { name: "🎯 Accuracy", value: `${(osu.accuracy || 0).toFixed(2)}%`, inline: true },
        { name: "🕹️ Play Count", value: `${osu.playCount?.toLocaleString() || 0}`, inline: true }
      )
      .setFooter({ 
        text: `Mode: ${selectedMode} • Evernight Rhythm Sensors`, 
        iconURL: interaction.client.user.displayAvatarURL() 
      });

   
    if (selectedMode !== osu.mode) {
      embed.setDescription(`*Note: Showing cached stats for **${osu.mode}**. Re-link to update mode!*`);
    }

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("osu! Cmd Error:", error);
    await interaction.reply({ content: "My rhythm sensor broke!", ephemeral: true });
  }
}