import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadUsers } from "../../data/userdata.js";

const API_BASE_URL = process.env.API_BASE_URL;

export const command = new SlashCommandBuilder()
    .setName("recent")
    .setDescription("View your (or someone else's) last played map")
    .addStringOption(option => 
        option.setName("username")
            .setDescription("The osu! username to check (optional)")
            .setRequired(false)
    );

export async function execute(interaction) {
    await interaction.deferReply();
    
    const users = loadUsers();
    const userId = interaction.user.id;
    const dbUser = users[userId];

    const usernameInput = interaction.options.getString("username");
    
    let targetId = null;
    let mode = "osu"; 

    if (usernameInput) {
        targetId = usernameInput; 
    } else {
        if (!dbUser) {
            return interaction.editReply("Please create an account with `/register` first, or specify a username!");
        }
        if (!dbUser.osu || !dbUser.osu.id) {
            return interaction.editReply("You haven't linked your osu! account! Use `/linkosu` or specify a username.");
        }
        targetId = dbUser.osu.id;
        mode = dbUser.osu.mode || "osu";
    }

    try {
        const res = await fetch(`${API_BASE_URL}/osu/latest/${encodeURIComponent(targetId)}?mode=${mode}`);
        const json = await res.json();

        if (!json.success) {
            return interaction.editReply(`**No recent plays found for ${usernameInput || "you"}.** (Maybe try a different mode?)`);
        }

        const play = json.data;
        const rankColors = {
            SS: 0xD9D919, S: 0xD9D919, A: 0x4B964B, B: 0x4B4B96, C: 0x964B96, D: 0x964B4B, F: 0x333333
        };
        const color = rankColors[play.rank] || 0xFF66AA;  
        const isFC = play.countMiss === 0 && play.rank !== 'F';
        let ppDisplay = "";
        const fmtPP = (lazer, classic) => {
            return `**${Math.round(lazer)}** _(${Math.round(classic)})_`;
        };

        if (play.rank === 'F') {
            // FAILED
            ppDisplay = `**0(failed)**If FC: ${fmtPP(play.ifFcPP, play.ifFcPPClassic)}`;
        } else if (isFC) {
            // FC
            ppDisplay = `${fmtPP(play.pp, play.maxPPClassic)}\nMax: ${fmtPP(play.maxPP, play.maxPPClassic)}`;
        } else {
            // CHOKE
            ppDisplay = `${fmtPP(play.pp, play.pp)}\nIf FC: ${fmtPP(play.ifFcPP, play.ifFcPPClassic)}`;
        }
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ 
                name: `Recent Play: ${play.user.username}`, 
                iconURL: play.user.avatar, 
                url: `https://osu.ppy.sh/users/${play.user.id}` 
            })
            .setTitle(`${play.title} [${play.version}] +${play.mods}`)
            .setURL(play.url)
            .setThumbnail(play.cover)
            .setDescription(`**Rank:** ${play.rank}${isFC ? " **(FC)**" : ""} • **Stars:** ⭐${play.stars.toFixed(2)}`)
            .addFields(
                { 
                    name: "Accuracy", 
                    value: `${play.accuracy.toFixed(2)}%`, 
                    inline: true 
                },
                { 
                    name: "PP(Lazer/classic)", 
                    value: ppDisplay, 
                    inline: true 
                },
                { 
                    name: "Combo", 
                    value: `**${play.combo}x**`, 
                    inline: true 
                },
                { 
                    name: "Stats", 
                    value: `[300: **${play.count300}**]  [100: **${play.count100}**]\n[50: **${play.count50}**]  [❌: **${play.countMiss}**]`, 
                    inline: false 
                }
            )
            .setFooter({ text: `Mode: ${mode} • Played at ${new Date(play.created_at).toLocaleString()}` });

        await interaction.editReply({ embeds: [embed] });

    } catch (err) {
        console.error(err);
        await interaction.editReply("Connecting to the osu! server failed. Check the username and try again!");
    }
}