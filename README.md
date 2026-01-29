# Evernight Bot

A simple Discord bot built with **discord.js**, featuring daily rewards, betting, and leaderboard systems 
![March Melet](assets/march-melet.png)
---

## Features

- **Daily Rewards** — Claim your daily credits and jades.
- **Head or Tail Bet** — Try your luck and win (or lose) your credits.
- **Leaderboard** — View the top users globally or within your server.
- **Blackjack with Evernight** — Play against Evernight in a game of Blackjack.
- **HSR Gacha System** — Pull for characters.
- **Shop System** — Spend your earnings on fun items or upgrades.
- **RPG Adventure Mode** - Play a turnbase games to earn more jades.
- **Blackjack with Friends** — Play against your Evernight in blackjack.
- :motorized_wheelchair: **Gen** - Generate a demotivator meme within your server.
- github linking and github profile flexing
- GeminiAI support.
- [chatguardAPI](https://github.com/cedrugs/Chatguard-API) by [Cedrugs](https://github.com/cedrugs)


---

## Upcoming Features
- Properly implement hard difficulty with unique enemies for RPG mode
- fix and rebalance some scalings in RPG mode
---

## Contributing

Feel free to fork and open a pull request! Suggestions for new features are always welcome.

## requirement
[node.js](https://nodejs.org)

## extra notes
### self hosting 
If you want to self host, you need to modify the file path according to your pc as currently it is hardcoded to match mine.
also you will need a backend server [elysia-evernight](https://github.com/SilverWolfiee/elysia-evernight)

```
if(os.platform() === "win32"){
  filePath = "C:\\Users\\EnDragyy\\evernight-database\\users.json"
}
else{
  filePath= "/home/silverwolf/Windows/Users/EnDragyy/evernight-database/users.json"
}
```
you need to modify this part here
### chatguard usage
You need to give Evernight admin permissions for chatguard to work properly.
Without admin perms, she won't be able to delete offensive message
