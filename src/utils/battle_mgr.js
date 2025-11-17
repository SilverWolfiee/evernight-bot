import { saveUsers, loadUsers } from "../../data/userdata.js";
import { startBattle } from "../../data/battle.js";
export async function battleInteraction(interaction){
    if (!interaction.isStringSelectMenu()){
        return
    }
    if (!interaction.customId.startsWith("adv_difficulty_")) return;
    const userId = interaction.customId.replace("adv_difficulty_", "");
    const difficulty = interaction.values[0];
    const users = loadUsers();
    const user = users[userId]
    
    if(!user){
        interaction.reply({ content: "Please register with /register first", ephemeral: true });
        return
    }
    user.session.inBattle = true;
    user.session.difficulty = difficulty;
    user.power = Math.max(0, user.power - 30) 
    saveUsers(users);
    
    await interaction.update({
        content: `Difficulty selected: **${difficulty.toUpperCase()}**!\n\nYour battle is being prepared...`,
        components: []
    });
    startBattle(userId, interaction)
    

}
export const enemies = {
    easy: [
        { name: "Silvermane Soldier", hp: 40, atk: 8, def: 2, spd: 101 },
        { name: "Fragmentum Beast", hp: 45, atk: 7, def: 3, spd: 95 },
        { name: "Void Ranger: Distorter", hp: 50, atk: 6, def: 1, spd: 90 }
    ],
    medium: [
        { name: "Mara-Struck Soldier", hp: 70, atk: 12, def: 4, spd: 115 },
        { name: "Automaton Direwolf", hp: 80, atk: 11, def: 5, spd: 95 },
        { name: "The Ascended", hp: 75, atk: 13, def: 3, spd: 100 }
    ],
    hard: [
        { name: "Abundance Sprite: Malefic Ape", hp: 100, atk: 18, def: 6, spd: 135 },
        { name: "Bronya", hp: 120, atk: 20, def: 8, spd: 132 },
        { name: "Cocolia's Echo", hp: 130, atk: 22, def: 10, spd: 95 }
    ]
};







