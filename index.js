const { Bot } = require("grammy");
const http = require("http");

// Веб-сервер для поддержки активности на Render
http.createServer((req, res) => res.end("Bot is running!")).listen(process.env.PORT || 3000);

const bot = new Bot(process.env.BOT_TOKEN);

bot.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage;

  // Проверка: если ID отправителя не совпадает с ID чата, значит, сообщение отправлено ВАМИ
  const isOutgoing = msg.from && msg.from.id !== msg.chat.id;

  console.log(`Текст: "${msg.text}", Исходящее: ${isOutgoing}`);

  // Если сообщение исходящее (написали вы сами) — бот ничего не делает
  if (isOutgoing) {
    return;
  }

  // Ответ входящему клиенту
  await ctx.reply("Приветствую! Сейчас я не в сети, когда я зайду в сеть, то обязательно прочту. Если хотите передать что-то срочное, то лучше позвоните мне.");
});

bot.start();
