import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { loadUsers, saveUsers } from "../../../data/userdata.js";
import { getTier, addXp } from "../level_mgr.js";
import { activeGames } from "./activegame.js";

const BASE_XP_REWARD = 50;
const XP_PER_LEVEL = 0.05;
const XP_PER_TIER = 0.1;

export class BlackjackGame {
  constructor(interaction, userId, bet) {
    this.interaction = interaction;
    this.userId = userId;
    this.bet = bet;
    this.users = {};
    this.player = [];
    this.dealer = [];
    this.deck = this.createDeck();
    this.finished = false;
  }

  createDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const values = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ];
    const deck = [];
    for (const s of suits)
      for (const v of values) deck.push({ value: v, suit: s });
    return deck.sort(() => Math.random() - 0.5);
  }

  drawCard() {
    return this.deck.pop();
  }

  getValue(hand) {
    let value = 0,
      aces = 0;
    for (const c of hand) {
      if (["J", "Q", "K"].includes(c.value)) value += 10;
      else if (c.value === "A") {
        value += 11;
        aces++;
      } else value += parseInt(c.value);
    }
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    return value;
  }

  formatHand(hand, hideDealer = false) {
    if (hideDealer) return `${hand[0].value}${hand[0].suit} [Hidden]`;
    return hand.map((c) => `${c.value}${c.suit}`).join(" ");
  }

  isNatural(hand) {
    return hand.length === 2 && this.getValue(hand) === 21;
  }

  cleanup() {
    this.finished = true;
    activeGames.delete(this.userId);
  }

  async start(buttonInteraction) {
    this.users = await loadUsers();
    const user = this.users[this.userId];

    if (!user || user.jades < this.bet) {
      activeGames.delete(this.userId);
      await buttonInteraction.followUp({
        content:
          "You don't have enough Stellar Jades <:stellar_jade:1432377631210344530>.",
        ephemeral: true,
      });
      return;
    }

    user.jades -= this.bet;
    saveUsers(this.users);

    this.player.push(this.drawCard(), this.drawCard());
    this.dealer.push(this.drawCard(), this.drawCard());

    const playerNatural = this.isNatural(this.player);
    const dealerNatural = this.isNatural(this.dealer);

   
    if (playerNatural || dealerNatural) {
      this.cleanup();

      let result;
      let outcomeMultiplier = 1.0;

      if (playerNatural && dealerNatural) {
        user.jades += this.bet; // Draw
        result = "Both got Blackjack! It's a draw... <:evernight_confused:1433435422125461586>";
        outcomeMultiplier = 1.0;
      } else if (playerNatural) {
        user.jades += this.bet * 3; // 2:1 Payout 
        result = "🎉 **NATURAL BLACKJACK!** You win 2:1 payout! <:evernight_daily:1432392306387980451>";
        outcomeMultiplier = 2.5;
      } else {
        result = "Evernight hit a Natural Blackjack~ <:evernight_smug:1433435206353944596>";
        outcomeMultiplier = 0.5;
      }

      const tier = getTier(user.level);
      const baseGain =
        BASE_XP_REWARD *
        (1 + user.level * XP_PER_LEVEL) *
        (1 + tier * XP_PER_TIER);
      const xpGain = Math.floor(baseGain * outcomeMultiplier);

      const leveledUp = addXp(user, xpGain);
      const levelMsg = leveledUp
        ? `\n🎉 **You Leveled Up to Level ${user.level}!**`
        : "";

      saveUsers(this.users);

      const embed = new EmbedBuilder()
        .setTitle(`Blackjack Result`)
        .setColor("DarkRed")
        .setDescription(
          `**Your hand:** ${this.formatHand(this.player)} (${this.getValue(this.player)})\n` +
            `**Evernight:** ${this.formatHand(this.dealer)} (${this.getValue(this.dealer)})\n\n${result}\n` +
            `+${xpGain} XP gained!${levelMsg}\n` +
            `Current Jades: ${user.jades}`,
        );

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("hit")
          .setLabel("Hit")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("stand")
          .setLabel("Stand")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

      await buttonInteraction.editReply({
        content: `Blackjack game of <@${this.userId}>`,
        embeds: [embed],
        components: [disabledRow],
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Blackjack with Evernight`)
      .setColor("DarkRed")
      .setDescription(
        `**Your hand:** ${this.formatHand(this.player)} (${this.getValue(this.player)})\n` +
          `**Evernight:** ${this.formatHand(this.dealer, true)}`,
      )
      .setFooter({ text: `Current Jades: ${user.jades}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("hit")
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("stand")
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("surrender")
        .setLabel("Surrender")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("double")
        .setLabel("Double Down")
        .setStyle(ButtonStyle.Secondary),
    );

    const gameMsg = await buttonInteraction.editReply({
      content: `Blackjack game of <@${this.userId}>`,
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    this.collector(gameMsg);
  }

  async collector(gameMsg) {
    const filter = (i) =>
      ["hit", "stand", "double", "surrender"].includes(i.customId);
    const collector = gameMsg.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== this.userId) {
        await i.reply({
          content: `Hey, wait your turn~ This is <@${this.userId}>'s game! <:evernight_confused:1433435422125461586>`,
          ephemeral: true,
        });
        return;
      }

      await i.deferUpdate();
      if (this.finished) return;

      this.users = await loadUsers();
      const user = this.users[this.userId];

      if (i.customId === "stand") {
        await this.finish(gameMsg, this.dealerPlay());
      } else if (i.customId === "double") {
        if (user.jades < this.bet) {
          await i.followUp({
            content: `You don't have enough Stellar Jades to double down!`,
            ephemeral: true,
          });
          return;
        }
        user.jades -= this.bet;
        this.bet *= 2;
        saveUsers(this.users);
        this.player.push(this.drawCard());

        const val = this.getValue(this.player);
        if (val > 21) {
          await this.finish(gameMsg, false);
        } else {
          await this.finish(gameMsg, this.dealerPlay());
        }
      } else if (i.customId === "surrender") {
        const refund = Math.floor(this.bet / 2);
        user.jades += refund;
        await this.finishSurrender(gameMsg, refund);
      } else if (i.customId === "hit") {
        this.player.push(this.drawCard());
        const val = this.getValue(this.player);
        if (val > 21) {
          await this.finish(gameMsg, false);
        } else {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("hit")
              .setLabel("Hit")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("stand")
              .setLabel("Stand")
              .setStyle(ButtonStyle.Secondary),
          );
          const embed = new EmbedBuilder()
            .setTitle(`Blackjack with Evernight`)
            .setColor("DarkRed")
            .setDescription(
              `**Your hand:** ${this.formatHand(this.player)} (${val})\n` +
                `**Evernight:** ${this.formatHand(this.dealer, true)}`,
            )
            .setFooter({ text: `Make your move` });

          await gameMsg.edit({
            content: `Blackjack game of <@${this.userId}>`,
            embeds: [embed],
            components: [row],
          });
        }
      }
    });

    collector.on("end", async () => {
      if (!this.finished) {
        this.cleanup();
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("hit")
            .setLabel("Hit")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("stand")
            .setLabel("Stand")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );
        await gameMsg.edit({
          content: `Time's up for <@${this.userId}>'s game!`,
          components: [disabledRow],
        });
      }
    });
  }

  dealerPlay() {
    while (this.getValue(this.dealer) < 17) this.dealer.push(this.drawCard());
    return this.getValue(this.dealer) <= 21;
  }

  async finishSurrender(gameMsg, refund) {
    this.cleanup();
    this.users = await loadUsers();
    const user = this.users[this.userId];
    const tier = getTier(user.level);
    const baseGain =
      BASE_XP_REWARD *
      (1 + user.level * XP_PER_LEVEL) *
      (1 + tier * XP_PER_TIER);
    const xpGain = Math.floor(baseGain * 0.25);
    const leveledUp = addXp(user, xpGain);
    const levelMsg = leveledUp
      ? `\n🎉 **You Leveled Up to Level ${user.level}!**`
      : "";

    saveUsers(this.users);

    const embed = new EmbedBuilder()
      .setTitle(`Blackjack Result`)
      .setColor("DarkRed")
      .setDescription(
        `**Your hand:** ${this.formatHand(this.player)} (${this.getValue(this.player)})\n` +
          `**Evernight:** ${this.formatHand(this.dealer, true)}\n\n` +
          `You surrendered! Returned **${refund}** Stellar Jades. <:evernight_confused:1433435422125461586>\n` +
          `+${xpGain} XP gained!${levelMsg}\n` +
          `Current Jades: ${user.jades}`,
      );

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("hit")
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("stand")
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("double")
        .setLabel("Double Down")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("surrender")
        .setLabel("Surrender")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true),
    );

    await gameMsg.edit({ embeds: [embed], components: [disabledRow] });
  }

  async finish(gameMsg, dealerSafe) {
    this.cleanup();
    this.users = await loadUsers();
    const playerVal = this.getValue(this.player);
    const dealerVal = this.getValue(this.dealer);
    const user = this.users[this.userId];

    let result;
    let outcomeMultiplier = 1.0;

    if (playerVal > 21) {
      result = "You busted! <:evernight_dog:1432386535520731166>";
      outcomeMultiplier = 0.5;
    } else if (!dealerSafe) {
      user.jades += this.bet * 2;
      result =
        "Evernight busted <:evernight_cry:1433434486418182325> — You win!";
      outcomeMultiplier = 2.0;
    } else if (playerVal > dealerVal) {
      user.jades += this.bet * 2;
      result =
        "You win against Evernight! <:evernight_daily:1432392306387980451>";
      outcomeMultiplier = 2.0;
    } else if (playerVal === dealerVal) {
      user.jades += this.bet;
      result = "It’s a draw... <:evernight_confused:1433435422125461586>";
      outcomeMultiplier = 1.0;
    } else {
      result =
        "Evernight wins this round~ <:evernight_smug:1433435206353944596>";
      outcomeMultiplier = 0.5;
    }

    const tier = getTier(user.level);
    const baseGain =
      BASE_XP_REWARD *
      (1 + user.level * XP_PER_LEVEL) *
      (1 + tier * XP_PER_TIER);
    const xpGain = Math.floor(baseGain * outcomeMultiplier);

    const leveledUp = addXp(user, xpGain);
    const levelMsg = leveledUp
      ? `\n🎉 **You Leveled Up to Level ${user.level}!**`
      : "";

    saveUsers(this.users);

    const embed = new EmbedBuilder()
      .setTitle(`Blackjack Result`)
      .setColor("DarkRed")
      .setDescription(
        `**Your hand:** ${this.formatHand(this.player)} (${playerVal})\n` +
          `**Evernight:** ${this.formatHand(this.dealer)} (${dealerVal})\n\n${result}\n` +
          `+${xpGain} XP gained!${levelMsg}\n` +
          `Current Jades: ${user.jades}`,
      );

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("hit")
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("stand")
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("double")
        .setLabel("Double Down")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("surrender")
        .setLabel("Surrender")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true),
    );

    await gameMsg.edit({ embeds: [embed], components: [disabledRow] });
  }
}

export async function handleBlackjackButton(interaction) {
  if (interaction.customId.startsWith("bj_start_")) {
    try {
      const parts = interaction.customId.split("_");
      const bet = parseInt(parts[2]);
      const ownerId = parts[3];

      if (ownerId && interaction.user.id !== ownerId) {
        return await interaction.reply({
          content: "This isn't your game setup~ Run /blackjack to start your own!",
          ephemeral: true,
        });
      }

      if (activeGames.has(interaction.user.id)) {
        return await interaction.reply({
          content: "You already have a game running!",
          ephemeral: true,
        });
      }

      await interaction.deferUpdate();

      const users = await loadUsers();
      const user = users[interaction.user.id];

      if (!user || user.jades < bet) {
        return await interaction.followUp({
          content: "Not enough Jades!",
          ephemeral: true,
        });
      }

      activeGames.add(interaction.user.id);

      const game = new BlackjackGame(interaction, interaction.user.id, bet);
      await game.start(interaction);
    } catch (error) {
      console.error("Error in handleBlackjackButton:", error);
      activeGames.delete(interaction.user.id);
    }
  }
}