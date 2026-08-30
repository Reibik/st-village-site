# ST VILLAGE website administration for Bedolaga bot

Готовый модуль добавляет в существующую админ-панель Bedolaga отдельный раздел
`🌐 Сайт`: версия, живое состояние, технические работы, объявления, отзывы,
аналитика и журнал действий.

## Переменные окружения бота

```env
SITE_ADMIN_BASE_URL=https://dev.stvillage.ru
SITE_BOT_API_TOKEN=<тот же секрет, что и на сайте>
SITE_ADMIN_BASIC_AUTH_USER=<логин защищённого dev-стенда>
SITE_ADMIN_BASIC_AUTH_PASSWORD=<пароль защищённого dev-стенда>
```

`SITE_BOT_API_TOKEN` должен совпадать со значением на сайте. Telegram ID
администраторов сайта задаются на сайте в `SITE_BOT_ADMIN_IDS` через запятую.
Две переменные Basic Auth нужны только для защищённого dev-стенда. На production
их следует удалить.

## Подключение к Bedolaga

1. Скопировать два файла из `app/` в одноимённые каталоги бота.
2. В `app/handlers/admin/__init__.py` добавить `site_management` в список импортов.
3. В `app/bot.py` импортировать `site_management as admin_site_management` и рядом
   с остальными административными модулями вызвать
   `admin_site_management.register_handlers(dp)`.
4. В `get_admin_main_keyboard()` перед кнопкой возврата добавить:

```python
[
    InlineKeyboardButton(
        text='🌐 Управление сайтом',
        callback_data='site_admin',
    )
],
```

На production достаточно поменять `SITE_ADMIN_BASE_URL` на
`https://stvillage.top`; код и подпись запросов остаются теми же.
