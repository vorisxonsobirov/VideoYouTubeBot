require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("❌ BOT_TOKEN не найден в .env файле");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const downloadDir = path.resolve(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

const ytDlpPath = path.resolve(__dirname, 'yt-dlp.exe');

// /start команда
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 Привет! Отправь ссылку на видео с YouTube, и я его скачаю!');
});

// обработка всех сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Пропускаем команды
  if (!text || text.startsWith('/')) return;

  // Проверка на ссылку
  if (text.includes('youtube.com') || text.includes('youtu.be')) {
    bot.sendMessage(chatId, '⏳ Скачиваю видео, подожди немного...');

    const timestamp = Date.now();
    const filePath = path.join(downloadDir, `video_${timestamp}.mp4`);

    // Формат 18 — это mp4 360p (наиболее совместимый с Telegram)
    const command = `"${ytDlpPath}" -f 18 -o "${filePath}" "${text}"`;
    console.log('📥 Выполняется команда:', command);

    exec(command, async (error, stdout, stderr) => {
      console.log('📤 STDOUT:', stdout);
      console.log('📥 STDERR:', stderr);

      if (error) {
        console.error('❌ Ошибка при скачивании:', error.message);
        bot.sendMessage(chatId, '❌ Не удалось скачать видео. Проверь ссылку или попробуй другое видео.');
        return;
      }

      if (!fs.existsSync(filePath)) {
        bot.sendMessage(chatId, '⚠️ Видео не было скачано. Возможно, оно слишком большое или ссылка недействительна.');
        return;
      }

      try {
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        console.log(`📦 Размер видео: ${fileSizeMB.toFixed(2)} МБ`);

        if (fileSizeMB > 49) {
          bot.sendMessage(chatId, '⚠️ Видео слишком большое для отправки в Telegram (более 50 МБ).');
        } else {
          await bot.sendVideo(chatId, filePath);
          bot.sendMessage(chatId, '✅ Готово!');
        }
      } catch (err) {
        console.error('❌ Ошибка при отправке видео:', err.message);
        bot.sendMessage(chatId, '❌ Ошибка при отправке видео: ' + err.message);
      } finally {
        fs.unlink(filePath, () => {}); // удаляем файл после отправки
      }
    });
  } else {
    bot.sendMessage(chatId, '📎 Пожалуйста, отправь ссылку на видео с YouTube.');
  }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});
