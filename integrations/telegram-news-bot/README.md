# Синхронизация новостей Telegram

Отдельная служба получает обычные `channel_post`, новые `rich_message` и
`edited_channel_post` из канала `@exitcloud_vpn`, безопасно преобразует разметку
и передаёт публикации в закрытый API сайта.

Для production в `/etc/st-village/site.env` должны быть заданы:

```env
TELEGRAM_NEWS_BOT_TOKEN=<токен новостного бота>
TELEGRAM_NEWS_CHANNEL=exitcloud_vpn
SITE_BOT_API_TOKEN=<случайный секрет длиной не менее 32 байт>
SITE_BOT_ADMIN_IDS=<Telegram ID владельца>
```

После публикации `main` выполните:

```bash
sudo bash /opt/st-village-site/current/ops/vps/install-news-bot.sh
```

Установщик переносит сохранённые новости и offset из dev, останавливает dev-бота
и запускает единственного production-получателя обновлений. Одновременно читать
`getUpdates` одним токеном из двух служб нельзя.
