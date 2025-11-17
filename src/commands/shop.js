import { loadUsers, saveUsers } from "../../data/userdata.js";
import { SlashCommandBuilder } from "discord.js";

const shopItems = {
    atk: { name: "Attack +50", cost: 100000, stat: "atk", increment: 50 },
    def: { name: "Defense +25", cost: 50000, stat: "def", increment: 25 },
    spd: { name: "Speed +1", cost: 150000, stat: "spd", increment: 1 },
    hp:  { name: "Max HP +250", cost: 125000, stat: "maxHP", increment: 250 }
};

export const command = new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Spend credits to upgrade your stats")
    .addStringOption(option =>
        option
            .setName("item")
            .setDescription("Item to purchase")
            .setRequired(true)
            .addChoices(
                { name: "Attack +50 (100,000)", value: "atk" },
                { name: "Defense +25 (50,000)", value: "def" },
                { name: "Speed +1 (150,000)", value: "spd" },
                { name: "Max HP +250 (125,000)", value: "hp" },
            )
    )
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("How many upgrades to buy?")
            .setRequired(true)
    );

export async function execute(interaction) {
    const users = loadUsers();
    const user = users[interaction.user.id];

    if (!user) {
        await interaction.reply({ content: "Please create an account using /register", ephemeral: true });
        return;
    }

    const itemKey = interaction.options.getString("item");
    const amount = interaction.options.getInteger("amount");

    if (amount < 1) {
        return interaction.reply({ content: "You must buy atleast 1 item, Are you too poor~~.", ephemeral: true });
    }

    const item = shopItems[itemKey];
    const totalCost = item.cost * amount;

    if (user.credits < totalCost) {
        return interaction.reply({
            content: `You need **${totalCost.toLocaleString()}<:credit:1432377745626759380>**, You are too poor and foolish to have that much Credits`,
            ephemeral: true
        });
    }

    user.credits -= totalCost;
    user.stats[item.stat] += item.increment * amount;
    if (!user.stats[item.stat]){
        user.stats[item.stat] = 0;
    } 
    user.stats[item.stat] += item.increment * amount;
    saveUsers(users);

    return interaction.reply(`
        **Purchase successful!**

        **You Bought:** ${item.name} × ${amount}  
        **Total cost:** ${totalCost.toLocaleString()} <:credit:1432377745626759380> 

        📈 **Your new stats**  
        > 🗡️ ATK: **${user.stats.atk}**  
        > 🛡️ DEF: **${user.stats.def}**  
        > 💨 SPD: **${user.stats.spd}**  
        > ❤️ Max HP: **${user.stats.maxHP}**

        Remaining Credits: **${user.credits.toLocaleString()}<:credit:1432377745626759380>**
    `);
}
