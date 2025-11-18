import { loadUsers, saveUsers } from "./userdata.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { enemies } from "../src/utils/battle_mgr.js";
import { getTier, addXp } from "../src/utils/level_mgr.js";
const battles = new Map();

const XP_PER_LEVEL = 0.10;
const XP_PER_TIER  = 0.20;
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
  const CRIT_RATE_PER_LEVEL = 0.0015;
  const CRIT_DMG_PER_LEVEL = 0.005;
  const CRIT_RATE_CAP = 0.35;
  const CRIT_DMG_CAP = 2.0;

  const scaled = { ...baseEnemy };

  scaled.hp = Math.max(1, Math.floor(baseEnemy.hp * (1 + HP_PER_LEVEL * (L - 1)) * diffMult));
  scaled.atk = Math.max(1, Math.floor(baseEnemy.atk * (1 + ATK_PER_LEVEL * (L - 1)) * diffMult));
  scaled.def = Math.max(0, Math.floor((baseEnemy.def || 0) * (1 + DEF_PER_LEVEL * (L - 1)) * diffMult));
  scaled.spd = Math.max(
    1,
    Math.floor(baseEnemy.spd * (1 + SPD_PER_LEVEL * (L - 1)) * diffMult)
  );

  if (typeof baseEnemy.critRate === 'number') {
    scaled.critRate = Math.min(CRIT_RATE_CAP, baseEnemy.critRate + CRIT_RATE_PER_LEVEL * (L - 1));
  }
  if (typeof baseEnemy.critDmg === 'number') {
    scaled.critDmg = Math.min(CRIT_DMG_CAP, baseEnemy.critDmg + CRIT_DMG_PER_LEVEL * (L - 1));
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

  const playerInit = {
    hp: user.stats.maxHP,
    atk: user.stats.atk,
    def: user.stats.def,
    critRate: user.stats.critRate ?? 0.12,
    critDmg: user.stats.critDmg ?? 1.5,
    spd: user.stats.spd,
    skillPoints: 3,
    power: user.power,
    energy: Math.min(200, user.energy ?? 50)
  };

  // Determine who acts first (HSR Spd System).
  const playerActionTime = 10000 / Math.max(1, playerInit.spd);
  const enemyActionTime = 10000 / Math.max(1, enemy.spd);
  const firstTurn = playerActionTime <= enemyActionTime ? "player" : "enemy";

  const battle = {
    player: playerInit,
    enemy,
    userId,
    turn: firstTurn,
    staticHeader: `You encounter **${enemy.name}**!\nPower: ${user.power} <:power:1434577803013259425>`,
    battleInfo: `Enemy HP: ${enemy.hp}\nYour HP: ${playerInit.hp}\nSkill Points: ${playerInit.skillPoints}\nEnergy: ${playerInit.energy}`,
    battleMessage: ""
  };

  battles.set(userId, battle);

 
  if (battle.turn === "enemy") {
    const enemyDmg = calculateEnemyDamage(battle, diff, user.level);
    battle.player.hp -= enemyDmg;


    const energyGain = Math.min(20, Math.max(1, Math.floor(enemyDmg * 0.2)));
    battle.player.energy = Math.min(200, battle.player.energy + energyGain);

    battle.battleMessage = `**${battle.enemy.name}** acts first and deals **${enemyDmg}** damage!`;

    if (battle.player.hp <= 0) {
      battles.delete(userId);
      saveUsers(users);
      battle.battleMessage += `\n**You were defeated by ${battle.enemy.name}...**`;
      await interaction.editReply({
        content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${battle.enemy.hp}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\n\n**Battle Message:**\n${battle.battleMessage}`,
        components: []
      });
      return;
    }


    battle.turn = "player";
    battle.battleInfo = `Enemy HP: ${battle.enemy.hp}\nYour HP: ${battle.player.hp}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}`;
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


  function computePlayerDamage(mult = 1) {
    const baseAtk = battle.player.atk || 0;
  
    const variance = 0.9 + Math.random() * 0.2;
    const raw = Math.floor(baseAtk * mult * variance);
    const isCrit = Math.random() < (battle.player.critRate ?? 0);
    const critMult = isCrit ? (battle.player.critDmg ?? 1.5) : 1;
    const effective = Math.max(0, Math.floor(raw * critMult) - (battle.enemy.def || 0));
    return { effective, isCrit, raw };
  }

  if (action === "atk") {
    const { effective, isCrit, raw } = computePlayerDamage(1);
    dmg = Math.max(0, effective);
    battle.enemy.hp -= dmg;
    battle.player.skillPoints += 1;
    battle.player.energy = Math.min(200, battle.player.energy + 5);
    playerMessage = `You bonk **${battle.enemy.name}** with your bat for **${dmg}** damage!${isCrit ? " (crit)" : ""}`;
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
    battle.player.energy = Math.min(200, battle.player.energy + 15);

    const { effective, isCrit } = computePlayerDamage(1.5);
    dmg = Math.max(0, effective);
    battle.enemy.hp -= dmg;
    playerMessage = `You swung your bat hard at **${battle.enemy.name}**, dealing **${dmg}** damage!${isCrit ? " (crit)" : ""}`;
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
    const { effective, isCrit } = computePlayerDamage(3.0);
    dmg = Math.max(0, effective);
    battle.enemy.hp -= dmg;
    playerMessage = `RULES ARE MADE TO BE BROKEN!! dealt **${dmg}** damage to **${battle.enemy.name}**${isCrit ? " (crit)" : ""}`;
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

 
    const energyGain = Math.min(20, Math.max(1, Math.floor(enemyDmg * 0.2)));
    battle.player.energy = Math.min(200, battle.player.energy + energyGain);

    battle.battleMessage += `\n**${battle.enemy.name}** attacks you for **${enemyDmg}** damage!`;
  }

  // Handle enemy death
  if (battle.enemy.hp <= 0) {
    battles.delete(userId);

    const baseRewards = {
      easy: { credits: 40000, jades: 50, xp :200 },
      medium: { credits: 50000, jades: 60, xp : 350},
      hard: { credits: 80000, jades: 100, xp : 1000}
    };

    const rewards = baseRewards[user.session.difficulty];
    const scaledCredits = Math.floor(rewards.credits * (1 + user.level * 0.08)); 
    const scaledJades = Math.floor(rewards.jades * (1 + user.level * 0.04));
    const tier = getTier(user.level);
    const xpGain = Math.floor(
        rewards.xp *
        (1 + user.level * XP_PER_LEVEL) *
        (1 + tier * XP_PER_TIER)
    );

    user.credits += scaledCredits;
    user.jades += scaledJades;
    const leveledUp = addXp(user, xpGain);

    saveUsers(users);

    let levelMsg = leveledUp ? `\nYou Leveled Up!!` : "";
    battle.battleMessage += `\n**You defeated ${battle.enemy.name}!**\nYou gained **${scaledCredits} <:credit:1432377745626759380>** and **${scaledJades} <:stellar_jade:1432377631210344530>**`;
    battle.battleMessage += `\nYou gained ${xpGain} Xp${levelMsg}`;

    return interaction.update({
      content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${Math.max(0, battle.enemy.hp)}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\n\n**Battle Message:**\n${battle.battleMessage}`,
      components: []
    });
  }

  // Handle player death
  if (battle.player.hp <= 0) {
    battles.delete(userId);
    saveUsers(users);
    battle.battleMessage += `\n**You were defeated by ${battle.enemy.name}...**`;
    return interaction.update({
      content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${Math.max(0, battle.enemy.hp)}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\n\n**Battle Message:**\n${battle.battleMessage}`,
      components: []
    });
  }

  // Continue battle
  battle.battleInfo = `Enemy HP: ${battle.enemy.hp}\nYour HP: ${battle.player.hp}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}`;
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

    
    const variance = 0.9 + Math.random() * 0.2;
    const atkRaw = enemy.atk * variance;

    const isCrit = Math.random() < critChance;
    let base = isCrit ? atkRaw * critDmgMult : atkRaw;

    base *= diffMult;
    base -= playerDef;

    const minDamage = diff === 'easy' ? 8 : diff === 'medium' ? 12 : 20;
    if (base < minDamage) base = minDamage;
    if (base < 0) base = 0;

    return Math.floor(base);
}

export { battles };
