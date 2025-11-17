import { loadUsers, saveUsers } from "./userdata.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { enemies } from "../src/utils/battle_mgr.js";
import { getTier } from "../src/utils/level_mgr.js";
const battles = new Map();

const DIFF_MULT = {
  easy: 0.85,
  medium: 1.0,
  hard: 1.25
};

function scaleEnemyStats(baseEnemy, playerLevel, diff) {
  const diffMult = DIFF_MULT[diff] ?? 1.0;
  const L = Math.max(1, playerLevel);

  const HP_PER_LEVEL = 0.18;
  const ATK_PER_LEVEL = 0.14;
  const DEF_PER_LEVEL = 0.10;
  const SPD_PER_LEVEL = 0.035;

  const scaled = { ...baseEnemy };

  scaled.hp = Math.max(1, Math.floor(baseEnemy.hp * (1 + HP_PER_LEVEL * (L - 1)) * diffMult));
  scaled.atk = Math.max(1, Math.floor(baseEnemy.atk * (1 + ATK_PER_LEVEL * (L - 1)) * diffMult));
  scaled.def = Math.max(0, Math.floor(baseEnemy.def * (1 + DEF_PER_LEVEL * (L - 1)) * diffMult));
  scaled.spd = Math.max(1, Math.floor(baseEnemy.spd * (1 + SPD_PER_LEVEL * (L - 1))));

  if (typeof baseEnemy.critRate === 'number') {
    scaled.critRate = Math.min(0.5, baseEnemy.critRate + 0.003 * (L - 1));
  }
  if (typeof baseEnemy.critDmg === 'number') {
    scaled.critDmg = Math.min(3.0, baseEnemy.critDmg + 0.01 * (L - 1));
  }

  scaled._base = baseEnemy;

  return scaled;
}

export async function startBattle(userId, interaction) {
  const users = loadUsers();
  const user = users[userId];
  if (!user || !user.session?.inBattle) return;

  const diff = user.session.difficulty;
  const rawEnemy = enemies[diff][Math.floor(Math.random() * enemies[diff].length)];

  const enemy = scaleEnemyStats({ ...rawEnemy }, user.level, diff);

  const battle = {
    player: {
      hp: user.stats.maxHP,
      atk: user.stats.atk,
      def: user.stats.def,
      critRate: user.stats.critRate,
      critDmg: user.stats.critDmg,
      spd: user.stats.spd,
      skillPoints: 3,
      power: user.power,
      energy: 50
    },
    enemy,
    userId,
    turn: (10000 / user.stats.spd) <= (10000 / enemy.spd) ? "player" : "enemy",
    staticHeader: `You encounter **${enemy.name}**!\nPower: ${user.power} <:power:1434577803013259425>`,
    battleInfo: `Enemy HP: ${enemy.hp}\nYour HP: ${user.stats.maxHP}\nSkill Points: 3`,
    battleMessage: ""
  };

  battles.set(userId, battle);

  if (battle.turn === "enemy") {
    const enemyDmg = calculateEnemyDamage(battle, user.session.difficulty, user.level);
    battle.player.hp -= enemyDmg;
    battle.battleMessage = `**${battle.enemy.name}** acts first and deals **${enemyDmg}** damage!`;

    if (battle.player.hp <= 0) {
      battles.delete(userId);
      saveUsers(users);
      battle.battleMessage += `\n**You were defeated by ${battle.enemy.name}...**`;
      await interaction.editReply({
        content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${battle.enemy.hp}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\n\n**Battle Message:**\n${battle.battleMessage}`,
        components: []
      });
      return;
    }

    battle.battleInfo = `Enemy HP: ${battle.enemy.hp}\nYour HP: ${battle.player.hp}\nSkill Points: ${battle.player.skillPoints}`;
    battle.turn = "player";
  }

  const row = new ActionRowBuilder().addComponents(actionRowButtons());
  await interaction.editReply({
    content: `${battle.staticHeader}\n\n**Battle Info:**\n${battle.battleInfo}\n\n**Battle Message:**\n${battle.battleMessage}`,
    components: [row]
  });
}

function actionRowButtons() {
  return [
    new ButtonBuilder().setCustomId("atk").setLabel("Attack").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("skill").setLabel("Skill").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("ult").setLabel("Ultimate").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("run").setLabel("Run").setStyle(ButtonStyle.Danger)
  ];
}

export async function handleBattleButton(interaction) {
  const userId = interaction.user.id;
  const battle = battles.get(userId);
  if (!battle) return;

  if (interaction.user.id !== battle.userId) {
    const users = loadUsers();
    const owner = users[battle.userId];
    return interaction.reply({
      content: `Hey! This is **${owner ? owner.username || "someone's" : "a"}** game. Start your own battle!`,
      ephemeral: true
    });
  }

  const users = loadUsers();
  const user = users[userId];
  const action = interaction.customId;

  if (battle.turn !== "player") {
    battle.battleMessage = "Wait for your turn!";
    const row = new ActionRowBuilder().addComponents(actionRowButtons());
    return interaction.update({
      content: `${battle.staticHeader}\n\n**Battle Info:**\n${battle.battleInfo}\n\n**Battle Message:**\n${battle.battleMessage}`,
      components: [row]
    });
  }

  let playerMessage = "";
  let dmg = 0;

  if (action === "atk") {
    dmg = Math.max(0, battle.player.atk - (battle.enemy.def || 0));
    battle.enemy.hp -= dmg;
    battle.player.skillPoints += 1;
    battle.player.energy += 5;
    if (battle.player.energy > 200) battle.player.energy = 200;
    playerMessage = `You bonk **${battle.enemy.name}** with your bat for **${dmg}** damage!`;
  } else if (action === "skill") {
    if (battle.player.skillPoints <= 0) {
      battle.battleMessage = "Not enough Skill Points!";
      const row = new ActionRowBuilder().addComponents(actionRowButtons());
      return interaction.update({
        content: `${battle.staticHeader}\n\n**Battle Info:**\n${battle.battleInfo}\n\n**Battle Message:**\n${battle.battleMessage}`,
        components: [row]
      });
    }

    battle.player.skillPoints -= 1;
    battle.player.energy += 15;
    if (battle.player.energy > 200) battle.player.energy = 200;

    dmg = Math.max(0, Math.floor(battle.player.atk * 1.5 - (battle.enemy.def || 0)));
    battle.enemy.hp -= dmg;
    playerMessage = `You swung your bat hard at **${battle.enemy.name}**, dealing **${dmg}** damage!`;
  } else if (action === "ult") {
    if (battle.player.energy < 100) {
      battle.battleMessage = "You don't have enough energy to use ultimate";
      const row = new ActionRowBuilder().addComponents(actionRowButtons());
      return interaction.update({
        content: `${battle.staticHeader}\n\n**Battle Info:**\n${battle.battleInfo}\n\n**Battle Message:**\n${battle.battleMessage}`,
        components: [row]
      });
    }

    if (!battle.enemy) {
      battle.battleMessage = "No enemy to attack!";
      const row = new ActionRowBuilder().addComponents(actionRowButtons());
      return interaction.update({
        content: `${battle.staticHeader}\n\n**Battle Info:**\n${battle.battleInfo}\n\n**Battle Message:**\n${battle.battleMessage}`,
        components: [row]
      });
    }

    battle.player.energy -= 100;
    dmg = Math.max(0, Math.floor(battle.player.atk * 3 - (battle.enemy.def || 0)));
    battle.enemy.hp -= dmg;
    playerMessage = `RULES ARE MADE TO BE BROKEN!! dealt **${dmg}** damage to ${battle.enemy.name} `;
  } else if (action === "run") {
    battles.delete(userId);
    user.power = Math.max(0, user.power - 30);
    saveUsers(users);
    return interaction.update({
      content: "You ran away! Even March isn't as pussy as you.",
      components: []
    });
  }

  battle.battleMessage = playerMessage;

  if (battle.enemy.hp > 0) {
    const enemyDmg = calculateEnemyDamage(battle, user.session.difficulty, user.level);
    battle.player.hp -= enemyDmg;

    let energyGain = enemyDmg;
    if (energyGain > 20) energyGain = 20;
    battle.player.energy += energyGain;

    battle.battleMessage += `\n**${battle.enemy.name}** attacks you for **${enemyDmg}** damage!`;
  }

  if (battle.enemy.hp <= 0) {
    battles.delete(userId);

    const baseRewards = {
      easy: { credits: 40000, jades: 50 },
      medium: { credits: 50000, jades: 60 },
      hard: { credits: 80000, jades: 100 }
    };

    const rewards = baseRewards[user.session.difficulty];
    const scaledCredits = Math.floor(rewards.credits * (1 + user.level * 0.12));
    const scaledJades = Math.floor(rewards.jades * (1 + user.level * 0.06));
    const tier = getTier(user.level);
    const xpGain = Math.floor(1000 * Math.pow(1.09, user.level) * (1 + tier * 0.12) * 0.25);

    user.credits += scaledCredits;
    user.jades += scaledJades;
    user.xp += xpGain;
    saveUsers(users);

    battle.battleMessage += `\n**You defeated ${battle.enemy.name}!**\nYou gained **${scaledCredits} <:credit:1432377745626759380>** and **${scaledJades} <:stellar_jade:1432377631210344530>**`;
    battle.battleMessage += `\nYou gained ${xpGain} Xp`;

    return interaction.update({
      content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${Math.max(0, battle.enemy.hp)}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\n\n**Battle Message:**\n${battle.battleMessage}`,
      components: []
    });
  }

  if (battle.player.hp <= 0) {
    battles.delete(userId);
    saveUsers(users);
    battle.battleMessage += `\n**You were defeated by ${battle.enemy.name}...**`;
    return interaction.update({
      content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${Math.max(0, battle.enemy.hp)}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\n\n**Battle Message:**\n${battle.battleMessage}`,
      components: []
    });
  }

  battle.battleInfo = `Enemy HP: ${battle.enemy.hp}\nYour HP: ${battle.player.hp}\nSkill Points: ${battle.player.skillPoints}\nEnergy : ${battle.player.energy}`;
  battle.turn = "player";

  const row = new ActionRowBuilder().addComponents(actionRowButtons());
  return interaction.update({
    content: `${battle.staticHeader}\n\n**Battle Info:**\n${battle.battleInfo}\n\n**Battle Message:**\n${battle.battleMessage}`,
    components: [row]
  });
}

function calculateEnemyDamage(battle, diff, userLevel) {
  const enemy = battle.enemy;
  const playerDef = battle.player.def || 0;

  const diffMult = DIFF_MULT[diff] ?? 1.0;

  const critChance = typeof enemy.critRate === 'number' ? enemy.critRate : 0.12;
  const critDmgMult = typeof enemy.critDmg === 'number' ? enemy.critDmg : 1.5;

  const atkScaled = enemy.atk * (1 + 0.15 * (Math.max(1, userLevel) - 1));

  const isCrit = Math.random() < critChance;
  let base = isCrit ? atkScaled * critDmgMult : atkScaled;

  base *= diffMult;
  base -= playerDef;

  const minDamage = diff === 'easy' ? 8 : diff === 'medium' ? 12 : 20;
  if (base < minDamage) base = minDamage;
  if (base < 0) base = 0;

  return Math.floor(base);
}

export { battles };
