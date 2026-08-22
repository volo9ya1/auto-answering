const { Bot } = require("grammy");
const http = require("http");

// Веб-сервер для поддержания активности на Render
http.createServer((req, res) => res.end("Bot is live!")).listen(process.env.PORT || 3000);

const bot = new Bot(process.env.BOT_TOKEN);

// Настройки геопозиции (Ташкент)
const MY_LATITUDE = 41.2995;
const MY_LONGITUDE = 69.2401;

// ID владельца для отчётов (замените 0 на ваш ID или задайте OWNER_ID в Render)
const OWNER_ID = Number(process.env.OWNER_ID) || 0; 

const lastActivity = new Map(); 
const stats = { total: 0, users: new Set() };

const SILENCE_DURATION = 10 * 60 * 1000; // Пауза 10 минут
const AUTO_DELETE_TIME = 2.5 * 60 * 1000; // Авто-удаление через 2.5 минуты

bot.catch((err) => console.error("Ошибка бота (перехвачена):", err.message));

// Команда /start в личных сообщениях с ботом
bot.command("start", async (ctx) => {
  await ctx.reply(`Привет! Я твой личный ассистент. Воскресные отчёты будут приходить в этот чат.\n\nТвой Telegram ID: \`${ctx.from.id}\``, { parse_mode: "Markdown" });
});

// Определение часа по времени Ташкента (UTC+5)
function getUzbekistanHour() {
  const options = { timeZone: "Asia/Tashkent", hour: "2-digit", hour12: false };
  return parseInt(new Intl.DateTimeFormat("ru-RU", options).format(new Date()), 10);
}

// Определение языка входящего сообщения
function detectLanguage(text = "") {
  const lower = text.toLowerCase();
  if (/[o‘g‘qh]|salom|qayerdasiz|qayerdasan/i.test(lower)) return "uz";
  if (/^[a-z0-9\s.,!?]+$/i.test(lower) && !/[а-яеё]/i.test(lower)) return "en";
  return "ru";
}

bot.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage;
  const chatId = ctx.chat.id;
  const text = msg.text || msg.caption || "";
  const lowerText = text.toLowerCase().trim();

  // 1. Игнорируем исходящие сообщения (отправленные вами)
  const isMyMessage = msg.from && msg.from.id !== msg.chat.id;
  if (isMyMessage) {
    lastActivity.set(chatId, Date.now());
    return;
  }

  // 2. Игнорируем пересланные сообщения
  if (msg.forward_date || msg.forward_origin) return;

  // 3. Защита от флуда и проверка 10-минутной паузы
  const lastTime = lastActivity.get(chatId);
  if (lastTime && (Date.now() - lastTime < SILENCE_DURATION)) return;
  lastActivity.set(chatId, Date.now());

  // Учёт статистики
  stats.total++;
  stats.users.add(chatId);

  const firstName = msg.from?.first_name || "Пользователь";
  const lang = detectLanguage(text);
  let replyText = "";
  let sendGeo = false;

  // 4. Триггер: Геопозиция
  if (lowerText.includes("где ты") || lowerText.includes("где вы") || lowerText.includes("qayerdasan") || lowerText.includes("qayerdasiz")) {
    sendGeo = true;
    replyText = (lang === "uz") ? `${firstName}, men shu yerdaman:` : 
                (lang === "en") ? `${firstName}, here is my location:` : 
                                  `${firstName}, вот моя локация:`;
  } 
  // 5. Триггер: Срочно / Важно в начале
  else if (lowerText.startsWith("срочно") || lowerText.startsWith("важно") || lowerText.startsWith("urgent") || lowerText.startsWith("muhim")) {
    replyText = (lang === "uz") ? `${firstName}, ko'rdimki bu muhim! Agar shoshilinch bo'lsa, menga qo'ng'iroq qiling.` :
                (lang === "en") ? `${firstName}, I see this is urgent! Please call me if it's critical.` :
                                  `${firstName}, вижу, что это срочно! Если дело горит — лучше наберите меня по телефону.`;
  }
  // 6. Триггер: Голосовые и видеосообщения
  else if (msg.voice || msg.video_note || msg.video) {
    replyText = (lang === "uz") ? `${firstName}, hozir ovozli/videoni eshita olmayman. Matn ko'rinishida yozing!` :
                (lang === "en") ? `${firstName}, I can't listen to voice/video right now. Please text me!` :
                                  `${firstName}, сейчас не могу прослушать аудио/видео. Напиши, пожалуйста, текстом!`;
  }
  // 7. Стандартный ответ (День / Ночь по Ташкенту)
  else {
    const hour = getUzbekistanHour();
    const isNight = hour >= 23 || hour < 8;

    if (isNight) {
      replyText = (lang === "uz") ? `${firstName}, men uxlayapman. Ertalab javob beraman!` :
                  (lang === "en") ? `${firstName}, I'm sleeping right now. Will reply in the morning!` :
                                    `${firstName}, я сейчас сплю. Отвечу утром!`;
    } else {
      replyText = `Приветствую ${firstName} ! Сейчас я не в сети, когда я зайду в сеть, то обязательно прочту. Если хотите передать что-то срочное, то лучше позвоните мне.`;
    }
  }

  // 8. Имитация человека (Статус "печатает..." на 2 секунды)
  await ctx.replyWithChatAction("typing");
  await new Promise((r) => setTimeout(r, 2000));

  // 9. Отправка ответа
  let sentMsg;
  if (sendGeo) {
    await ctx.reply(replyText);
    sentMsg = await ctx.replyWithLocation(MY_LATITUDE, MY_LONGITUDE);
  } else {
    sentMsg = await ctx.reply(replyText);
  }

  // 10. Авто-удаление ответа через 2.5 минуты
  if (sentMsg) {
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(chatId, sentMsg.message_id);
      } catch (e) {
        console.error("Ошибка авто-удаления:", e.message);
      }
    }, AUTO_DELETE_TIME);
  }
});

// Еженедельный отчёт по воскресеньям в 20:00 (по Ташкенту)
setInterval(async () => {
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tashkent", weekday: "short" }).format(now);
  const hour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tashkent", hour: "numeric", hour12: false }).format(now), 10);

  if (day === "Sun" && hour === 20 && OWNER_ID > 0) {
    const report = `📊 **Еженедельный отчёт автоответчика**\n\n` +
                   `• Всего автоответов: ${stats.total}\n` +
                   `• Уникальных собеседников: ${stats.users.size}`;
    try {
      await bot.api.sendMessage(OWNER_ID, report, { parse_mode: "Markdown" });
      stats.total = 0;
      stats.users.clear();
    } catch (e) {
      console.error("Ошибка отправки отчёта:", e.message);
    }
  }
}, 60 * 60 * 1000);

bot.start();
