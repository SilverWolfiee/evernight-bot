import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder} from "discord.js";

const link = "https://api.open-meteo.com/v1/forecast?";
export const command = new SlashCommandBuilder()
  .setName("weather")
  .setDescription("Check weather forecast")
  .addStringOption((option) =>
    option
      .setName("location")
      .setDescription("City or area to view")
      .setRequired(true),
  );

export async function execute(interaction) {
  const location = interaction.options.getString("location");
  await interaction.deferReply();
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      return interaction.editReply({
        content: "Ugh, I couldn't find that place on the Star Rail",
        ephemeral: true,
      });
    }
    const { latitude, longitude, name, country } = geoData.results[0];
    const search = `${link}latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,visibility,uv_index&timezone=auto`;
    const response = await fetch(search);
    const data = await response.json();
    const current = data.current;
    const file = new AttachmentBuilder('./assets/march7th_head.png');
    const weatherEmbed = new EmbedBuilder()
      .setColor(0x61e2ff)
      .setTitle(`Weather Report: ${name}, ${country}`)
      .setThumbnail("attachment://march7th_head.png")
      .addFields(
        { name: "🌡️ Temp", value: `${current.temperature_2m}°C`, inline: false },
        {
          name: "💧 Humidity",
          value: `${current.relative_humidity_2m}%`,
          inline: false,
        },
        {
          name: "💨 Wind",
          value: `${current.wind_speed_10m} km/h`,
          inline: false,
        },
        {
          name: "👁️ Visibility",
          value: `${(current.visibility / 1000).toFixed(1)} km`,
          inline: false,
        },
        { name: "☀️ UV Index", value: `${current.uv_index}`, inline: false },
      )
      .setFooter({
        text: `Requested by ${interaction.user.username} | Astral Express Navigator`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [weatherEmbed], files : [file] });
  } catch (error) {
    console.log(error);
    await interaction.editReply("Something went wrong!");
  }
}
