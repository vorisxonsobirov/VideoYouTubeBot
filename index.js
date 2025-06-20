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

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 Привет! Отправь ссылку на видео с YouTube, и я его скачаю!');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  if (text.includes('youtube.com') || text.includes('youtu.be')) {
    bot.sendMessage(chatId, '⏳ Скачиваю видео, подожди немного...');

    const timestamp = Date.now();
    const filePath = path.join(downloadDir, `video_${timestamp}.mp4`);
    const command = `"${ytDlpPath}" -f 18 -o "${filePath}" "${text}"`;

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Ошибка при скачивании:', error.message);
        bot.sendMessage(chatId, '❌ Не удалось скачать видео. Проверь ссылку или попробуй другое.');
        return;
      }

      if (!fs.existsSync(filePath)) {
        bot.sendMessage(chatId, '⚠️ Видео не скачано. Возможно, оно слишком большое или ссылка недействительна.');
        return;
      }

      try {
        await bot.sendVideo(chatId, filePath);
        bot.sendMessage(chatId, '✅ Готово!');
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

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});
