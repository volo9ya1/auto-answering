const { Bot } = require("grammy");
const http = require("http");

// Век-заглушка для Render
http.createServer((req, res) => res.end("Bot is running!")).listen(process.env.PORT || 3000);

// Ваш бот
const bot = new Bot(process.env.BOT_TOKEN);

bot.on("business_message", async (ctx) => {
  await ctx.reply("Приветствую! Сейчас я не в сети,когда зайду в сеть, я обязательно прочту.Если хотите передать что-то срочное то лучше позвоните мне.");
});

bot.start();
