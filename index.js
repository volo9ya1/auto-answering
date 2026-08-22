const { Bot } = require("grammy");
const http = require("http");

// Веб-сервер для поддержки активности на Render
http.createServer((req, res) => res.end("Bot is live!")).listen(process.env.PORT || 3000);

const bot = new Bot(process.env.BOT_TOKEN);

// Настройки геопозиции (По умолчанию: Ташкент)
const MY_LATITUDE = 41.2995;
const MY_LONGITUDE = 69.2401;

// Введите ваш личный Telegram ID для получения отчётов (или добавьте OWNER_ID в Render Environment Variables)
const OWNER_ID = Number(process.env.OWNER_ID) || 7087685751; 

// Память бота
const lastActivity = new Map(); 
const stats = { total: 0, users: new Set() };

const SILENCE_DURATION = 5 * 60 * 1000; // Пауза 5 минут (защита от флуда)
const AUTO_DELETE_TIME = 2.5 * 60 * 1000; // Удаление автоответа через 2.5 минуты

bot.catch((err) => console.error("Ошибка бота (перехвачена):", err.message));

// Время Ташкента (UTC+5)
function getUzbekistanHour() {
  const options = { timeZone: "Asia/Tashkent", hour: "2-digit", hour12: false };
  return parseInt(new Intl.DateTimeFormat("ru-RU", options).format(new Date()), 10);
}

// Определение языка (Узбекский / Английский / Русский)
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

  // 1. Проверка исходящего сообщения (написали вы)
  const isMyMessage = msg.from && msg.from.id !== msg.chat.id;
  if (isMyMessage) {
    lastActivity.set(chatId, Date.now());
    return;
  }

  // 2. Игнорирование пересланного контента
  if (msg.forward_date || msg.forward_origin) return;

  // 3. Защита от флуда и таймаут 10 минут
  const lastTime = lastActivity.get(chatId);
  if (lastTime && (Date.now() - lastTime < SILENCE_DURATION)) return;
  lastActivity.set(chatId, Date.now());

  // Учёт статистики
  stats.total++;
  stats.users.add(chatId);

  const firstName = msg.from?.first_name || "друг";
  const lang = detectLanguage(text);
  let replyText = "";
  let sendGeo = false;

  // 4. Защита от голосовых и видеосообщений
  if (msg.voice || msg.video_note || msg.video) {
    if (lang === "uz") replyText = `${firstName}, hozir ovozli/videoni eshita olmayman. Matn ko'rinishida yozing!`;
    else if (lang === "en") replyText = `${firstName}, I can't listen to voice/video right now. Please text me!`;
    else replyText = `${firstName}, сейчас не могу прослушать аудио/видео. Напиши, пожалуйста, текстом!`;
  } 
  // 5. Запрос геопозиции
  else if (["где ты", "где вы", "qayerdasiz", "qayerdasan"].some(q => lowerText.includes(q))) {
    sendGeo = true;
    if (lang === "uz") replyText = `${firstName}, men shu yerdaman:`;
    else if (lang === "en") replyText = `${firstName}, here is my location:`;
    else replyText = `${firstName}, вот моя локация:`;
  }
  // 6. Триггер на "Срочно" / "Важно" в начале фразы
  else if (/^(срочно|важно|urgent|muhim)/i.test(lowerText)) {
    if (lang === "uz") replyText = `${firstName}, ko'rdimki bu muhim! Agar shoshilinch bo'lsa, menga qo'ng'iroq qiling.`;
    else if (lang === "en") replyText = `${firstName}, I see this is urgent! Please call me if it's critical.`;
    else replyText = `${firstName}, вижу, что это срочно! Если дело горит — лучше наберите меня по телефону.`;
  } 
  // 7. Смена День / Ночь (Ташкент: 23:00 — 08:00)
  else {
    const hour = getUzbekistanHour();
    const isNight = hour >= 23 || hour < 8;

    if (isNight) {
      if (lang === "uz") replyText = `${firstName}, men uxlayapman. Ertalab javob beraman!`;
      else if (lang === "en") replyText = `${firstName}, I'm sleeping right now. Will reply in the morning!`;
      else replyText = `${firstName}, я уже сплю, звук выключен. Обязательно отвечу утром!`;
    } else {
      if (lang === "uz") replyText = `${firstName}, salom! Hozir bandman, bo'shashim bilan javob beraman.`;
      else if (lang === "en") replyText = `${firstName}, hi! I'm busy right now, will get back to you soon.`;
      else replyText = `${firstName}, привет! Сейчас я не у телефона, освобожусь — сразу отвечу.`;
    }
  }

  // 8. Имитация человека (Статус "печатает..." на 3 секунды)
  await ctx.replyWithChatAction("typing");
  await new Promise((r) => setTimeout(r, 3000));

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

// 11. Отчёт по воскресеньям (проверка каждый час)
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
