import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { loadUsers, saveUsers } from "../../data/userdata.js";

export class BlackjackGame {
  constructor(interaction, userId, bet) {
    this.interaction = interaction;
    this.userId = userId;
    this.bet = bet;
    this.users = loadUsers();
    this.player = [];
    this.dealer = [];
    this.deck = this.createDeck();
    this.finished = false;
  }

  createDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const deck = [];
    for (const s of suits) for (const v of values) deck.push({ value: v, suit: s });
    return deck.sort(() => Math.random() - 0.5);
  }

  drawCard() {
    return this.deck.pop();
  }

  getValue(hand) {
    let value = 0, aces = 0;
    for (const c of hand) {
      if (["J", "Q", "K"].includes(c.value)) value += 10;
      else if (c.value === "A") { value += 11; aces++; }
      else value += parseInt(c.value);
    }
    while (value > 21 && aces > 0) { value -= 10; aces--; }
    return value;
  }

  formatHand(hand, hideDealer = false) {
    if (hideDealer) return `${hand[0].value}${hand[0].suit} [Hidden]`;
    return hand.map(c => `${c.value}${c.suit}`).join(" ");
  }

  async start() {
    const user = this.users[this.userId];
    if (user.jades < this.bet) {
      await this.interaction.reply({
        content: "You don't have enough Stellar Jades <:stellar_jade:1432377631210344530>.",
        ephemeral: true,
      });
      return;
    }

    user.jades -= this.bet;
    saveUsers(this.users);

    this.player.push(this.drawCard(), this.drawCard());
    this.dealer.push(this.drawCard(), this.drawCard());

    const embed = new EmbedBuilder()
      .setTitle(`Blackjack with Evernight`)
      .setColor("DarkRed")
      .setDescription(
        `**Your hand:** ${this.formatHand(this.player)} (${this.getValue(this.player)})\n` +
        `**Evernight:** ${this.formatHand(this.dealer, true)}`
      )
      .setFooter({ text: `Current Jades: ${user.jades}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("hit").setLabel("Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("stand").setLabel("Stand").setStyle(ButtonStyle.Secondary)
    );

    const gameMsg = await this.interaction.followUp({
      content: `Blackjack game of <@${this.userId}>`,
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    this.collector(gameMsg);
  }

  async collector(gameMsg) {
    const filter = i => ["hit", "stand"].includes(i.customId);
    const collector = gameMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async i => {
      if (i.user.id !== this.userId) {
        await i.reply({
          content: `Hey, wait your turn~ This is <@${this.userId}>'s game! <:evernight_confused:1433435422125461586>`,
          ephemeral: true,
        });
        return;
      }

      await i.deferUpdate();
      if (this.finished) return;

      if (i.customId === "hit") {
        this.player.push(this.drawCard());
        const val = this.getValue(this.player);
        if (val > 21) {
          this.finished = true;
          await this.finish(gameMsg, false);
        } else {
          const embed = new EmbedBuilder()
            .setTitle(`Blackjack with Evernight`)
            .setColor("DarkRed")
            .setDescription(
              `**Your hand:** ${this.formatHand(this.player)} (${val})\n` +
              `**Evernight:** ${this.formatHand(this.dealer, true)}`
            )
            .setFooter({ text: `Make your move` });

          await gameMsg.edit({
            content: `Blackjack game of <@${this.userId}>`,
            embeds: [embed],
          });
        }
      } else if (i.customId === "stand") {
        this.finished = true;
        await this.finish(gameMsg, this.dealerPlay());
      }
    });

    collector.on("end", async () => {
      if (!this.finished) {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(true)
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

  async finish(gameMsg, dealerSafe) {
    const playerVal = this.getValue(this.player);
    const dealerVal = this.getValue(this.dealer);
    const user = this.users[this.userId];

    let result;
    if (playerVal > 21) {
      result = "You busted! <:evernight_dog:1432386535520731166>";
    } else if (!dealerSafe) {
      user.jades += this.bet * 2;
      result = "Evernight busted <:evernight_cry:1433434486418182325> — You win!";
    } else if (playerVal > dealerVal) {
      user.jades += this.bet * 2;
      result = "You win against Evernight! <:evernight_daily:1432392306387980451>";
    } else if (playerVal === dealerVal) {
      user.jades += this.bet;
      result = "It’s a draw... <:evernight_confused:1433435422125461586>";
    } else {
      result = "Evernight wins this round~ <:evernight_smug:1433435206353944596>";
    }

    saveUsers(this.users);

    const embed = new EmbedBuilder()
      .setTitle(`Blackjack Result>`)
      .setColor("DarkRed")
      .setDescription(
        `**Your hand:** ${this.formatHand(this.player)} (${playerVal})\n` +
        `**Evernight:** ${this.formatHand(this.dealer)} (${dealerVal})\n\n${result}\n` +
        `Current Jades: ${user.jades}`
      );

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    await gameMsg.edit({ embeds: [embed], components: [disabledRow] });
  }
}

export async function handleBlackjackButton(interaction) {
  const users = loadUsers();
  const user = users[interaction.user.id];
  if (!user) {
    await interaction.reply({
      content: "Please create an account using /register.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === "bj_single") {
    await interaction.reply({ content: "Enter your bet in Jades (number only):", ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on("collect", async m => {
      const bet = parseInt(m.content);
      if (isNaN(bet) || bet <= 0) {
        await interaction.followUp({ content: "Invalid bet. Use a positive number.", ephemeral: true });
        return;
      }
      if (user.jades < bet) {
        await interaction.followUp({ content: "Not enough Jades to place that bet.", ephemeral: true });
        return;
      }

      const game = new BlackjackGame(interaction, interaction.user.id, bet);
      await game.start();
    });

    collector.on("end", collected => {
      if (collected.size === 0)
        interaction.followUp({ content: "You didn't enter a bet in time!", ephemeral: true });
    });
  } else if (interaction.customId === "bj_multi") {
    await interaction.reply({ content: "Multiplayer mode coming soon!", ephemeral: true });
  }
}
