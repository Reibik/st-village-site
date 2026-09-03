# Отдельный бот синхронизации новостей

Служба получает `channel_post` и `edited_channel_post` от отдельного Telegram-бота
и передаёт публикации в закрытый API сайта. Bedolaga-бот не используется.

## Настройка

1. Добавьте отдельного бота администратором канала `@exitcloud_vpn`.
2. В `/etc/st-village/dev.env` задайте:

```env
TELEGRAM_NEWS_BOT_TOKEN=<токен отдельного бота>
TELEGRAM_NEWS_CHANNEL=exitcloud_vpn
SITE_NEWS_ACTOR_ID=<один из Telegram ID в SITE_BOT_ADMIN_IDS>
SITE_NEWS_SYNC_URL=http://127.0.0.1:3001
SITE_NEWS_OFFSET_FILE=/opt/st-village-dev/data/telegram-news-offset.json
```

`SITE_BOT_API_TOKEN` и `SITE_BOT_ADMIN_IDS` уже используются закрытым API сайта.
Токен бота не попадает в браузер и Git. Если у бота настроен webhook или его
обновления уже читает другая программа, сначала нужно отключить тот получатель:
Bot API допускает только один способ получения обновлений одновременно.

3. Установите службу командой из текущего релиза:

```bash
sudo bash /opt/st-village-dev/current/ops/vps/install-dev-news-bot.sh
```

Служба начинает синхронизацию с новых обновлений. Старые публикации продолжает
показывать резервный публичный парсер сайта.
