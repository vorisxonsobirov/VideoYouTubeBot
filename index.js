require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const downloadDir = path.resolve(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

// Абсолютный путь к yt-dlp.exe (предполагается, что он в той же папке, что и index.js)
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

    // Формируем путь для сохранения файла
    const filePath = path.join(downloadDir, `video_${Date.now()}.mp4`);

    // Формируем команду с кавычками для путей
    const command = `"${ytDlpPath}" -f "best[ext=mp4]" -o "${filePath}" "${text}"`;

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('Ошибка при скачивании:', error.message);
        bot.sendMessage(chatId, '❌ Не удалось скачать видео. Возможно, ссылка неверна или видео слишком большое.');
        return;
      }

      if (!fs.existsSync(filePath)) {
        bot.sendMessage(chatId, '⚠️ Видео не было скачано. Возможно, оно слишком большое или ссылка недействительна.');
        return;
      }

      try {
        await bot.sendVideo(chatId, filePath);
        bot.sendMessage(chatId, '✅ Готово!');
      } catch (err) {
        bot.sendMessage(chatId, '❌ Ошибка при отправке видео: ' + err.message);
      } finally {
        fs.unlinkSync(filePath); // Удаляем видео после отправки
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