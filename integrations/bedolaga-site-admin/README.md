# ST VILLAGE website administration for Bedolaga bot

Готовый модуль добавляет в существующую админ-панель Bedolaga отдельный раздел
`🌐 Сайт`: версия, живое состояние, технические работы, объявления, отзывы,
аналитика и журнал действий. Второй обработчик зеркалирует новые и изменённые
публикации канала на сайт: разметку, кнопки, альбомы, фото, видео, анимации,
документы, аудио, голосовые сообщения, стикеры и опросы.

## Переменные окружения бота

```env
SITE_ADMIN_BASE_URL=https://dev.stvillage.ru
SITE_BOT_API_TOKEN=<тот же секрет, что и на сайте>
SITE_ADMIN_BASIC_AUTH_USER=<логин защищённого dev-стенда>
SITE_ADMIN_BASIC_AUTH_PASSWORD=<пароль защищённого dev-стенда>
SITE_NEWS_CHANNEL=exitcloud_vpn
SITE_NEWS_ACTOR_ID=<Telegram ID администратора из SITE_BOT_ADMIN_IDS>
```

`SITE_BOT_API_TOKEN` должен совпадать со значением на сайте. Telegram ID
администраторов сайта задаются на сайте в `SITE_BOT_ADMIN_IDS` через запятую.
Две переменные Basic Auth нужны только для защищённого dev-стенда. На production
их следует удалить.

На сервере сайта задайте `TELEGRAM_NEWS_BOT_TOKEN` — токен того же бота. Он не
попадает в браузер: сайт использует его только внутри защищённого медиапрокси.
Для обратной совместимости сайт может использовать `STATUS_ALERT_TELEGRAM_BOT_TOKEN`,
но отдельная переменная делает назначение секрета понятнее.

## Подключение к Bedolaga

1. Скопировать три файла из `app/` в одноимённые каталоги бота.
2. В `app/handlers/admin/__init__.py` добавить `site_management` в список импортов.
3. В `app/bot.py` импортировать `site_management as admin_site_management` и рядом
   с остальными административными модулями вызвать
   `admin_site_management.register_handlers(dp)`.
4. В `app/bot.py` добавить `site_news_sync` в импорт из `app.handlers`, а после
   регистрации обычных обработчиков вызвать `site_news_sync.register_handlers(dp)`.
   Это автоматически добавит `channel_post` и `edited_channel_post` в список
   разрешённых webhook-обновлений Bedolaga.
5. В `get_admin_main_keyboard()` перед кнопкой возврата добавить:

```python
[
    InlineKeyboardButton(
        text='🌐 Управление сайтом',
        callback_data='site_admin',
    )
],
```

Добавьте бота администратором канала `@exitcloud_vpn`. Синхронизация начнётся со
следующей новой или изменённой публикации; Telegram Bot API не выдаёт боту полную
историю канала, поэтому прежние записи продолжает подхватывать резервная публичная
лента сайта.

На production достаточно поменять `SITE_ADMIN_BASE_URL` на
`https://stvillage.top`; код и подпись запросов остаются теми же.
