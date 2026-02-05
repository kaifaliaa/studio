
const BOT_TOKEN = '8066546474:AAH9txmZ5sHGxILr_ALT5QhOr5nbgByIZnI';
const CHAT_ID = '1687453754';

export const sendTelegramMessage = async (message: string) => {
  if (BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID') {
    console.warn('Telegram Bot Token or Chat ID is not configured. Please update services/telegramService.ts');
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error sending Telegram message:', errorData);
    }
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
};
