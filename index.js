const { Bot } = require("grammy");

// Получаем токен из переменных окружения
const bot = new Bot(process.env.BOT_TOKEN);

// Обработка бизнес-сообщений из профиля
bot.on("business_message", async (ctx) => {
  await ctx.reply("Приветствую! Сейчас я не в сети,когда зайду в сеть, я обязательно прочту.Если хотите передать что-то срочное то лучше позвоните мне. ");
});

bot.start();
