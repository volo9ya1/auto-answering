const { Bot } = require("grammy");
const http = require("http");

// Веб-сервер для поддержки активности на Render
http.createServer((req, res) => res.end("Bot is running!")).listen(process.env.PORT || 3000);

// Инициализация бота
const bot = new Bot(process.env.BOT_TOKEN);

// Обработка сообщений в режиме Telegram Business
bot.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage;

  // Логирование для проверки в консоли Render
  console.log(`Текст: "${msg.text}", Исходящее: ${msg.is_outgoing}`);

  // Если сообщение отправили вы сами — игнорируем его
  if (msg.is_outgoing) {
    return;
  }

  // Ответ клиенту
  await ctx.reply("Приветствую! Сейчас я не в сети, когда я зайду в сеть, то обязательно прочту. Если хотите передать что-то срочное, то лучше позвоните мне.");
});

bot.start();
