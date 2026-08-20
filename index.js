const { Bot } = require("grammy");
const http = require("http");

http.createServer((req, res) => res.end("Bot is running!")).listen(process.env.PORT || 3000);

const bot = new Bot(process.env.BOT_TOKEN);

// Хранилище времени ваших последних ответов для каждого чата
const lastMyMessages = new Map();

// Время паузы бота после вашего личного ответа (15 минут в миллисекундах)
const PAUSE_DURATION = 10 * 60 * 1000;

bot.on("business_message", async (ctx) => {
  const chatId = ctx.chat.id;

  // 1. Если сообщение отправили ВЫ: запоминаем время и ничего не отвечаем
  if (ctx.businessMessage.is_outgoing) {
    lastMyMessages.set(chatId, Date.now());
    return;
  }

  // 2. Проверяем, писали ли вы сами в этот чат за последние 15 минут
  const lastReplyTime = lastMyMessages.get(chatId);
  if (lastReplyTime && (Date.now() - lastReplyTime < PAUSE_DURATION)) {
    // Вы недавно отвечали личным сообщением — бот не мешает диалогу
    return;
  }

  // 3. Если вы не писали в этот чат или прошло больше 15 минут — бот отвечает
  await ctx.reply("Приветствую! Сейчас я не в сети, когда я зайду в сеть, то обязательно прочту. Если хотите передать что-то срочное , то лучше позвоните мне.");
});

bot.start();
