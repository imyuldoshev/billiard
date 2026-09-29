import { state } from "../state/store";

export async function sendReceiptToTelegram(tableId: number, startTime: string, endTime: string, gamePrice: number, barOrders: any[]) {
  const botToken = state.tgBotToken;
  const chatId = state.tgChatId;
  const chatId2 = state.tgChatId2;

  if (!botToken || (!chatId && !chatId2)) {
    console.warn("Telegram bot token yoki chat id kiritilmagan");
    return;
  }

  try {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    const start = startDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const end = endDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    let message = `${tableId}-stol\n`;
    message += `${start} ✅ - ${end} ❌\n`;
    message += `${gamePrice.toLocaleString("ru-RU")} so'm\n`;

    if (barOrders && barOrders.length > 0) {
      message += `BAR :\n`;
      barOrders.forEach(order => {
        message += `${order.name} - ${order.qty} ta ( ${(order.price * order.qty).toLocaleString("ru-RU")} )\n`;
      });
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    if (chatId) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      });
    }

    if (chatId2) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId2,
          text: message
        })
      });
    }
  } catch (error) {
    console.error("Telegramga yuborishda xatolik:", error);
  }
}
