/**
 * Direct Telegram Bot API — replaces the connector-gateway.lovable.dev proxy.
 * TELEGRAM_API_KEY is the bot token issued by @BotFather.
 */

export interface TelegramSendMessageParams {
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  disableWebPagePreview?: boolean;
  replyMarkup?: unknown;
}

export async function sendTelegramMessage(params: TelegramSendMessageParams): Promise<Response> {
  const token = Deno.env.get("TELEGRAM_API_KEY");
  if (!token) throw new Error("TELEGRAM_API_KEY is not configured");

  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: params.text,
      parse_mode: params.parseMode ?? "HTML",
      disable_web_page_preview: params.disableWebPagePreview ?? true,
      ...(params.replyMarkup ? { reply_markup: params.replyMarkup } : {}),
    }),
  });
}
