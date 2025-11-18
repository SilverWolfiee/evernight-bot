import { loadUsers, saveUsers } from "./userdata.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { enemies } from "../src/utils/battle_mgr.js";
import { getTier, addXp } from "../src/utils/level_mgr.js";
const battles = new Map()

const XP_PER_LEVEL = 0.1
const XP_PER_TIER = 0.2
const DIFF_MULT ={
  easy : 1.0,
  medium : 2.0,
  hard : 4.0,
}
function scaleEnemyStats(baseEnemy, playerLevel, diff){
  const diffMult = DIFF_MULT[diff]??1.0
  const L = Math.max(1, playerLevel)
  const HP_GROWTH = 1.040
  const ATK_GROWTH = 1.032;
  const DEF_GROWTH = 1.025;
  const SPD_GROWTH = 1.006;
  const CRIT_RATE_PER_LEVEL = 0.0015;
  const CRIT_DMG_PER_LEVEL  = 0.005;
  const CRIT_RATE_CAP = 0.35;
  const CRIT_DMG_CAP  = 2.0;
  const safeBase = {
    hp: baseEnemy.hp ?? 1,
    atk: baseEnemy.atk ?? 1,
    def: baseEnemy.def ?? 0,
    spd: baseEnemy.spd ?? 100,
    critRate: typeof baseEnemy.critRate === "number" ? baseEnemy.critRate : undefined,
    critDmg: typeof baseEnemy.critDmg === "number" ? baseEnemy.critDmg : undefined,
    name: baseEnemy.name ?? "Enemy",
    ...baseEnemy
  };
  const scaled = {...safeBase}
  scaled.hp = Math.floor(safeBase.hp * Math.pow(HP_GROWTH, L - 1) * diffMult)
  scaled.atk = Math.floor(safeBase.atk * Math.pow(ATK_GROWTH, L - 1) * diffMult)
  scaled.def = Math.floor(safeBase.def * Math.pow(DEF_GROWTH, L - 1) * diffMult)
  scaled.spd = Math.floor(safeBase.spd * Math.pow(SPD_GROWTH, L - 1) * diffMult)
  if(typeof safeBase.critRate === "number"){
    scaled.critRate = Math.min(CRIT_DMG_CAP, safeBase.critRate + CRIT_RATE_PER_LEVEL)*(L-1)
  }
  if (typeof safeBase.critDmg === "number") {
    scaled.critDmg = Math.min(
      CRIT_DMG_CAP,
      safeBase.critDmg + CRIT_DMG_PER_LEVEL * (L - 1)
    );
  }
  return scaled

}
function predictNextTurn(battle, count = 3) {
  const out = [];
  const sim = {
    position: {
      player: battle.position.player,
      enemy: battle.position.enemy
    },
    player: { spd: battle.player.spd },
    enemy:  { spd: battle.enemy.spd }
  };

  for (let i = 0; i < count; i++) {
    const p = sim.position.player;
    const e = sim.position.enemy;

    const sp = sim.player.spd || 100;
    const se = sim.enemy.spd || 100;

    const ticksToPlayer = Math.ceil(p / sp);
    const ticksToEnemy  = Math.ceil(e / se);

    if (ticksToPlayer < ticksToEnemy) {
      sim.position.player = 10000;
      sim.position.enemy -= ticksToPlayer * se;
      out.push("player");
    } else {
      sim.position.enemy = 10000;
      sim.position.player -= ticksToEnemy * sp;
      out.push("enemy");
    }
  }
  return out;
} 

function getNextActor(battle) {
  const p = battle.position.player;
  const e = battle.position.enemy;
  const sp = battle.player.spd || 100;
  const se = battle.enemy.spd || 100;

  const ticksToPlayer = Math.ceil(p / sp);
  const ticksToEnemy  = Math.ceil(e / se);

  if (ticksToPlayer < ticksToEnemy) {
    battle.position.player = 10000;
    battle.position.enemy -= ticksToPlayer * se;
    return "player";
  } else {
    battle.position.enemy = 10000;
    battle.position.player -= ticksToEnemy * sp;
    return "enemy";
  }
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

  const playerActionTime = 10000 / Math.max(1, playerInit.spd);
  const enemyActionTime  = 10000 / Math.max(1, enemy.spd);
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

  battle.position = { player: 10000, enemy: 10000 };
  battles.set(userId, battle);

  if (battle.turn === "enemy") {
    let first = true;
    while (true) {
      const enemyDmg = calculateEnemyDamage(battle, diff, user.level);
      battle.player.hp -= enemyDmg;
      const energyGain = Math.min(20, Math.max(1, Math.floor(enemyDmg * 0.2)));
      battle.player.energy = Math.min(200, battle.player.energy + energyGain);

      if (first) {
        battle.battleMessage = `**${battle.enemy.name}** acts first and deals **${enemyDmg}** damage!`;
        first = false;
      } else {
        battle.battleMessage += `\n**${battle.enemy.name}** acts and deals **${enemyDmg}** damage!`;
      }

      if (battle.player.hp <= 0) {
        battles.delete(userId);
        saveUsers(users);
        battle.battleMessage += `\n**You were defeated by ${battle.enemy.name}...**`;
        await interaction.editReply({
          content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${battle.enemy.hp}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\n**Battle Message:**\n${battle.battleMessage}`,
          components: []
        });
        return;
      }

      const next = getNextActor(battle);
      if (next === "player") {
        battle.turn = "player";
        break;
      }
      // else continue loop to let enemy act again
    }

    const nextTurns = predictNextTurn(battle, 3)
      .map(t => t === "player" ? "You" : battle.enemy.name)
      .join(" → ");

    battle.battleInfo =`Enemy HP: ${battle.enemy.hp}\nYour HP: ${battle.player.hp}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\nNext turns: ${nextTurns}`;
  } else {
    const nextTurns = predictNextTurn(battle, 3)
      .map(t => t === "player" ? "You" : battle.enemy.name)
      .join(" → ");

    battle.battleInfo =`Enemy HP: ${battle.enemy.hp}\nYour HP: ${battle.player.hp}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\nNext turns: ${nextTurns}`;
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
    const { effective, isCrit } = computePlayerDamage(1);
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

  if (battle.enemy.hp <= 0) {
    battles.delete(userId);

    const baseRewards = {
      easy: { credits: 40000, jades: 50, xp: 200 },
      medium: { credits: 50000, jades: 60, xp: 350 },
      hard: { credits: 80000, jades: 100, xp: 1000 }
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

  if (battle.player.hp <= 0) {
    battles.delete(userId);
    saveUsers(users);
    battle.battleMessage += `\n**You were defeated by ${battle.enemy.name}...**`;
    return interaction.update({
      content: `${battle.staticHeader}\n\n**Battle Info:**\nEnemy HP: ${Math.max(0, battle.enemy.hp)}\nYour HP: ${Math.max(0, battle.player.hp)}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\n\n**Battle Message:**\n${battle.battleMessage}`,
      components: []
    });
  }

  battle.turn = getNextActor(battle);
  const nextTurns = predictNextTurn(battle, 3)
    .map(t => t === "player" ? "You" : battle.enemy.name)
    .join(" → ");
  battle.battleInfo =`Enemy HP: ${battle.enemy.hp}\nYour HP: ${battle.player.hp}\nSkill Points: ${battle.player.skillPoints}\nEnergy: ${battle.player.energy}\nNext turns: ${nextTurns}`;
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
