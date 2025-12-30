import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { loadUsers, linkGithub } from "../../data/userdata.js"; // ✅ Removed 'saveUsers' since we don't need it here anymore!

const API_BASE_URL = process.env.API_BASE_URL; 

export const command = new SlashCommandBuilder()
  .setName("linkgithub")
  .setDescription("Link your GitHub account to your profile");

export async function execute(interaction) {
  const userId = interaction.user.id;
  await interaction.deferReply({ ephemeral: true });

  // 1. Check if user exists (Read-only check)
  const users = loadUsers();
  if (!users[userId]) {
      return interaction.editReply("❌ You don't have an account! Please use `/register` first.");
  }

  try {
    // 2. Ask VPS for the Link 🔗
    const res = await fetch(`${API_BASE_URL}/github/link?userId=${userId}`);
    if (!res.ok) throw new Error("VPS Error");
    const data = await res.json();

    // 3. Show Button to User
    const verifyBtn = new ButtonBuilder()
        .setCustomId('verify_gh')
        .setLabel('✅ I have logged in!')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(verifyBtn);

    const responseMsg = await interaction.editReply({
      content: `🔗 **Link your GitHub:**\n[Click here to authorize](${data.url})\n\nOnce you see the success page, click the button below!`,
      components: [row]
    });

    // 4. Wait for Click
    const collector = responseMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== userId) return i.reply({ content: "Not your button!", ephemeral: true });
        await i.deferUpdate();

        // 5. Fetch Data from VPS
        const checkRes = await fetch(`${API_BASE_URL}/github/retrieve/${userId}`);
        const checkData = await checkRes.json();

        if (checkData.success) {
            
          
            linkGithub(userId, checkData.data);

            await i.editReply({ 
                content: `✅ **Success!** Linked GitHub account: **${checkData.data.username}**`, 
                components: [] 
            });
            collector.stop();
        } else {
            await i.followUp({ content: "Elysia said: " + checkData.message, ephemeral: true });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
             interaction.editReply({ content: "**Time out!** Please run the command again.", components: [] });
        }
    });

  } catch (err) {
    console.error(err);
    await interaction.editReply("MR YANG!! The OAuth server is offline.");
  }
}