const { Bot } = require("grammy");
const http = require("http");

// Веб-сервер для активности Render
http.createServer((req, res) => res.end("Bot is running!")).listen(process.env.PORT || 3000);

const bot = new Bot(process.env.BOT_TOKEN);

// Хранилище: ID чата -> время последнего твоего сообщения
const lastActivity = new Map();

// Время молчания в миллисекундах (10 минут)
const SILENCE_DURATION = 10 * 60 * 1000;

bot.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage;
  const chatId = ctx.chat.id;

  // 1. Проверяем, кто отправил сообщение
  const isMyMessage = msg.from && msg.from.id !== msg.chat.id;

  if (isMyMessage) {
    // Если это ТЫ ответил, записываем время и выходим
    lastActivity.set(chatId, Date.now());
    console.log(`Зафиксировал твой ответ в чате ${chatId}`);
    return;
  }

  // 2. Если пишет КЛИЕНТ, проверяем, не слишком ли рано после твоего ответа
  const lastTime = lastActivity.get(chatId);
  if (lastTime && (Date.now() - lastTime < SILENCE_DURATION)) {
    console.log(`Диалог активен (пауза 10 мин), бот молчит.`);
    return;
  }

  // 3. Если пауза прошла или ты еще не отвечал — отправляем автоответ
  await ctx.reply("Приветствую! Сейчас я не в сети, когда я зайду в сеть, то обязательно прочту. Если хотите передать что-то срочное, то лучше позвоните мне.");
});

bot.start();
