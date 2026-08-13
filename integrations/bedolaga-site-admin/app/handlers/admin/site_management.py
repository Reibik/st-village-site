"""Website-only administration menu for Bedolaga Telegram bot."""

from __future__ import annotations

import html
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from aiogram import Dispatcher, F, types
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import User
from app.services.site_admin_api import SiteAdminApi, SiteAdminApiError
from app.utils.decorators import admin_required, error_handler


class AnnouncementFlow(StatesGroup):
    title = State()
    message = State()
    placement = State()
    schedule_at = State()
    confirm = State()


class IncidentFlow(StatesGroup):
    title = State()
    summary = State()
    confirm = State()


def button(text: str, data: str | None = None, url: str | None = None) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, callback_data=data, url=url)


def main_keyboard(base_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [button("🔄 Обновить", "site_admin_refresh"), button("🌍 Открыть сайт", url=base_url)],
        [button("🏷 Версия", "site_admin_version"), button("🚧 Техработы", "site_admin_incidents")],
        [button("📢 Объявления", "site_admin_announcements"), button("📊 Состояние", "site_admin_status")],
        [button("⭐ Отзывы", "site_admin_reviews"), button("📈 Аналитика", "site_admin_analytics")],
        [button("📜 Журнал действий", "site_admin_audit")],
        [button("⬅️ Назад", "admin_panel")],
    ])


def back_keyboard(target: str = "site_admin") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[button("⬅️ Назад", target)]])


def fmt_time(value: str | None) -> str:
    if not value:
        return "—"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone().strftime("%d.%m.%Y · %H:%M")
    except ValueError:
        return value


def dashboard_text(data: dict) -> str:
    release = data.get("release", {})
    infrastructure = data.get("infrastructure") or {}
    online, total = infrastructure.get("online", 0), infrastructure.get("total", 0)
    site_ok = data.get("site", {}).get("status") == "operational"
    return (
        "🌐 <b>ST VILLAGE · Управление сайтом</b>\n\n"
        f"{'🟢' if site_ok else '🟡'} Сайт: <b>{'работает' if site_ok else 'требует внимания'}</b>\n"
        f"🏷 Версия: <b>v{html.escape(str(release.get('version', '—')))}</b> · {html.escape(str(release.get('channel', '—')))}\n"
        f"🖥 Серверы: <b>{online} из {total}</b> онлайн\n"
        f"🚧 Активные работы: <b>{data.get('incidents', {}).get('active', 0)}</b>\n"
        f"📢 Объявления: <b>{data.get('announcements', {}).get('active', 0)}</b>\n"
        f"⭐ Отзывы на модерации: <b>{data.get('reviews', {}).get('pending', 0)}</b>\n\n"
        f"🕒 Обновлено: {fmt_time(data.get('generatedAt'))}"
    )


async def edit_with_error(callback: types.CallbackQuery, operation):
    try:
        return await operation()
    except SiteAdminApiError as error:
        await callback.answer(str(error), show_alert=True)
        return None


@admin_required
@error_handler
async def show_site_admin(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    data = await edit_with_error(callback, lambda: api.dashboard(callback.from_user.id))
    if data:
        await callback.message.edit_text(dashboard_text(data), parse_mode="HTML", reply_markup=main_keyboard(api.base_url))
        await callback.answer("Данные обновлены" if callback.data == "site_admin_refresh" else None)


@admin_required
@error_handler
async def show_version(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    data = await edit_with_error(callback, lambda: api.dashboard(callback.from_user.id))
    if not data:
        return
    release = data["release"]
    text = (
        "🏷 <b>Версия сайта</b>\n\n"
        f"Версия: <b>v{html.escape(str(release['version']))}</b>\n"
        f"Канал: <code>{html.escape(str(release['channel']))}</code>\n"
        f"Название: {html.escape(str(release['name']))}\n"
        f"Сборка: <code>{html.escape(str(release['build']))}</code>\n\n"
        "✅ API версии отвечает"
    )
    await callback.message.edit_text(text, parse_mode="HTML", reply_markup=back_keyboard())
    await callback.answer()


@admin_required
@error_handler
async def show_status(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    data = await edit_with_error(callback, lambda: api.dashboard(callback.from_user.id))
    if not data:
        return
    infra = data.get("infrastructure") or {}
    ok = infra.get("status") == "operational"
    text = (
        "📊 <b>Состояние инфраструктуры</b>\n\n"
        f"{'🟢' if ok else '🟡'} Общий статус: <b>{'работает штатно' if ok else 'есть отклонения'}</b>\n"
        f"🖥 Онлайн: <b>{infra.get('online', 0)} / {infra.get('total', 0)}</b>\n"
        f"🔧 Обслуживание: <b>{infra.get('maintenance', 0)}</b>\n"
        f"⚡ Средняя задержка: <b>{round(infra.get('averageLatencyMs') or 0)} мс</b>\n"
        f"📈 Uptime 30 дней: <b>{infra.get('uptime30') or 0}%</b>"
    )
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [button("🔄 Проверить ещё раз", "site_admin_status"), button("🌍 Живой статус", url="https://status.stvillage.ru")],
        [button("⬅️ Назад", "site_admin")],
    ])
    await callback.message.edit_text(text, parse_mode="HTML", reply_markup=keyboard)
    await callback.answer()


@admin_required
@error_handler
async def show_analytics(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    data = await edit_with_error(callback, lambda: api.dashboard(callback.from_user.id))
    if not data:
        return
    metrics = data.get("analytics", {})
    outbound = metrics.get("outbound", {})
    vitals = metrics.get("vitals", [])
    vital_lines = "\n".join(f"• {html.escape(str(item['name']))}: <b>{round(item['average'], 1)}</b> ({item['samples']})" for item in vitals) or "• Пока недостаточно данных"
    await callback.message.edit_text(
        "📈 <b>Аналитика сайта · 7 дней</b>\n\n"
        f"👤 Переходы в кабинет: <b>{outbound.get('cabinet', 0)}</b>\n"
        f"✈️ Переходы в Telegram: <b>{outbound.get('telegram', 0)}</b>\n\n"
        f"<b>Core Web Vitals</b>\n{vital_lines}",
        parse_mode="HTML", reply_markup=back_keyboard(),
    )
    await callback.answer()


@admin_required
@error_handler
async def show_reviews(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    data = await edit_with_error(callback, lambda: api.dashboard(callback.from_user.id))
    if not data:
        return
    count = data.get("reviews", {}).get("pending", 0)
    moderation_url = f"{api.base_url}/reviews/moderation"
    await callback.message.edit_text(
        f"⭐ <b>Отзывы сайта</b>\n\nНа модерации: <b>{count}</b>\n\n"
        "Для полной карточки отзыва откройте защищённую страницу модерации.",
        parse_mode="HTML", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [button("🔐 Открыть модерацию", url=moderation_url)], [button("⬅️ Назад", "site_admin")],
        ]),
    )
    await callback.answer()


@admin_required
@error_handler
async def show_announcements(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    items = await edit_with_error(callback, lambda: api.announcements(callback.from_user.id))
    if items is None:
        return
    now = datetime.now(timezone.utc).isoformat()
    active = [item for item in items if item.get("state") == "published" and item.get("startsAt", "") <= now and (not item.get("endsAt") or item["endsAt"] > now)]
    scheduled = [item for item in items if item.get("state") == "published" and item.get("startsAt", "") > now]
    drafts = [item for item in items if item.get("state") == "draft"]
    lines = ["📢 <b>Объявления сайта</b>", "", f"Активных: <b>{len(active)}</b> · Запланировано: <b>{len(scheduled)}</b> · Черновиков: <b>{len(drafts)}</b>"]
    lines.extend(f"\n• {html.escape(item['title'])}\n  {fmt_time(item.get('startsAt'))} · {item.get('placement', 'all')}" for item in active[:5])
    rows = [
        [button("➕ Создать", "site_admin_announcement_new")],
        [button("📋 Обновить список", "site_admin_announcements")],
    ]
    rows.extend([[button(f"🗄 В архив: {item['title'][:24]}", f"sa_arc:{item['id']}")]] for item in active[:3])
    rows.append([button("⬅️ Назад", "site_admin")])
    keyboard = InlineKeyboardMarkup(inline_keyboard=rows)
    await callback.message.edit_text("\n".join(lines), parse_mode="HTML", reply_markup=keyboard)
    await callback.answer()


@admin_required
@error_handler
async def start_announcement(callback: types.CallbackQuery, state: FSMContext, db_user: User, db: AsyncSession):
    kind = callback.data.removeprefix("site_admin_announcement_kind_") if "_kind_" in callback.data else ""
    if not kind:
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [button("🔵 Информация", "site_admin_announcement_kind_info"), button("🆕 Обновление", "site_admin_announcement_kind_update")],
            [button("🟡 Техработы", "site_admin_announcement_kind_maintenance"), button("🔴 Важное", "site_admin_announcement_kind_critical")],
            [button("🟣 Предложение", "site_admin_announcement_kind_promo")], [button("❌ Отмена", "site_admin_announcements")],
        ])
        await callback.message.edit_text("📢 <b>Новое объявление</b>\n\nШаг 1 из 3 · Выберите тип:", parse_mode="HTML", reply_markup=keyboard)
        await callback.answer()
        return
    await state.set_state(AnnouncementFlow.title)
    await state.update_data(kind=kind)
    await callback.message.edit_text("📢 <b>Новое объявление</b>\n\nШаг 2 из 3 · Отправьте заголовок (до 100 символов).", parse_mode="HTML", reply_markup=back_keyboard("site_admin_announcements"))
    await callback.answer()


@admin_required
@error_handler
async def announcement_title(message: types.Message, state: FSMContext, db_user: User, db: AsyncSession):
    title = (message.text or "").strip()
    if not 3 <= len(title) <= 100:
        await message.answer("Заголовок должен содержать от 3 до 100 символов.")
        return
    await state.update_data(title=title)
    await state.set_state(AnnouncementFlow.message)
    await message.answer("📢 <b>Новое объявление</b>\n\nШаг 3 из 3 · Отправьте текст объявления (до 800 символов).", parse_mode="HTML")


@admin_required
@error_handler
async def announcement_message(message: types.Message, state: FSMContext, db_user: User, db: AsyncSession):
    body = (message.text or "").strip()
    if not 5 <= len(body) <= 800:
        await message.answer("Текст должен содержать от 5 до 800 символов.")
        return
    await state.update_data(message=body)
    await state.set_state(AnnouncementFlow.placement)
    await message.answer("📍 <b>Где показать объявление?</b>", parse_mode="HTML", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [button("🌐 Весь сайт", "site_admin_announcement_place_all")],
        [button("🏠 Только главная", "site_admin_announcement_place_home"), button("📊 Только статус", "site_admin_announcement_place_status")],
        [button("❌ Отмена", "site_admin_announcements")],
    ]))


@admin_required
@error_handler
async def announcement_placement(callback: types.CallbackQuery, state: FSMContext, db_user: User, db: AsyncSession):
    placement = callback.data.removeprefix("site_admin_announcement_place_")
    await state.update_data(placement=placement)
    await callback.message.edit_text("🗓 <b>Когда опубликовать?</b>", parse_mode="HTML", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [button("⚡ Сейчас", "site_admin_announcement_schedule_now")],
        [button("🕒 Запланировать", "site_admin_announcement_schedule_later")],
        [button("❌ Отмена", "site_admin_announcements")],
    ]))
    await callback.answer()


async def send_announcement_preview(message: types.Message, state: FSMContext):
    data = await state.get_data()
    placement_names = {"all": "весь сайт", "home": "главная", "status": "страница статуса"}
    preview = (
        f"👁 <b>Предпросмотр</b>\n\n<b>{html.escape(data['title'])}</b>\n{html.escape(data['message'])}\n\n"
        f"Показ: {placement_names.get(data.get('placement'), 'весь сайт')}\nНачало: {fmt_time(data.get('startsAt'))}"
    )
    await state.set_state(AnnouncementFlow.confirm)
    await message.answer(preview, parse_mode="HTML", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [button("✅ Опубликовать", "site_admin_announcement_publish"), button("📝 Сохранить черновик", "site_admin_announcement_draft")],
        [button("❌ Отмена", "site_admin_announcements")],
    ]))


@admin_required
@error_handler
async def announcement_schedule(callback: types.CallbackQuery, state: FSMContext, db_user: User, db: AsyncSession):
    if callback.data.endswith("now"):
        await state.update_data(startsAt=datetime.now(timezone.utc).isoformat())
        await send_announcement_preview(callback.message, state)
    else:
        await state.set_state(AnnouncementFlow.schedule_at)
        await callback.message.edit_text(
            "🕒 <b>Запланированная публикация</b>\n\nОтправьте дату и время по Москве в формате:\n<code>15.08.2026 12:30</code>",
            parse_mode="HTML", reply_markup=back_keyboard("site_admin_announcements"),
        )
    await callback.answer()


@admin_required
@error_handler
async def announcement_schedule_at(message: types.Message, state: FSMContext, db_user: User, db: AsyncSession):
    try:
        local = datetime.strptime((message.text or "").strip(), "%d.%m.%Y %H:%M").replace(tzinfo=ZoneInfo("Europe/Moscow"))
        if local <= datetime.now(ZoneInfo("Europe/Moscow")):
            raise ValueError
    except ValueError:
        await message.answer("Введите будущую дату в формате <code>15.08.2026 12:30</code>.", parse_mode="HTML")
        return
    await state.update_data(startsAt=local.astimezone(timezone.utc).isoformat())
    await send_announcement_preview(message, state)


@admin_required
@error_handler
async def save_announcement(callback: types.CallbackQuery, state: FSMContext, db_user: User, db: AsyncSession):
    data = await state.get_data()
    api = SiteAdminApi()
    payload = {**data, "state": "published" if callback.data.endswith("publish") else "draft", "dismissible": True}
    result = await edit_with_error(callback, lambda: api.save_announcement(callback.from_user.id, payload))
    if result:
        await state.clear()
        await callback.message.edit_text("✅ <b>Объявление опубликовано</b>\n\nИзменение уже доступно на сайте.", parse_mode="HTML", reply_markup=back_keyboard("site_admin_announcements"))
        await callback.answer("Готово")


@admin_required
@error_handler
async def archive_announcement(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    announcement_id = callback.data.split(":", 1)[1]
    api = SiteAdminApi()
    items = await edit_with_error(callback, lambda: api.announcements(callback.from_user.id))
    if items is None:
        return
    announcement = next((item for item in items if item.get("id") == announcement_id), None)
    if not announcement:
        await callback.answer("Объявление не найдено", show_alert=True)
        return
    result = await edit_with_error(callback, lambda: api.save_announcement(callback.from_user.id, {**announcement, "state": "archived"}))
    if result:
        await callback.answer("Объявление перенесено в архив")
        await show_announcements(callback, db_user, db)


@admin_required
@error_handler
async def show_incidents(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    items = await edit_with_error(callback, lambda: api.incidents(callback.from_user.id))
    if items is None:
        return
    active = [item for item in items if item.get("status") != "resolved"]
    lines = ["🚧 <b>Технические работы</b>", "", f"Активных: <b>{len(active)}</b>"]
    lines.extend(f"\n• {html.escape(item['title'])}\n  {item['status']} · {fmt_time(item.get('startsAt'))}" for item in active[:5])
    rows = [[button("➕ Создать техработы", "site_admin_incident_new")]]
    rows.extend([[button(f"✅ Завершить: {item['title'][:24]}", f"site_admin_incident_resolve:{item['id']}")]] for item in active[:4])
    rows.append([button("⬅️ Назад", "site_admin")])
    await callback.message.edit_text("\n".join(lines), parse_mode="HTML", reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    await callback.answer()


@admin_required
@error_handler
async def start_incident(callback: types.CallbackQuery, state: FSMContext, db_user: User, db: AsyncSession):
    await state.set_state(IncidentFlow.title)
    await callback.message.edit_text("🚧 <b>Новые технические работы</b>\n\nШаг 1 из 2 · Отправьте короткий заголовок.", parse_mode="HTML", reply_markup=back_keyboard("site_admin_incidents"))
    await callback.answer()


@admin_required
@error_handler
async def incident_title(message: types.Message, state: FSMContext, db_user: User, db: AsyncSession):
    title = (message.text or "").strip()
    if not 3 <= len(title) <= 120:
        await message.answer("Заголовок должен содержать от 3 до 120 символов.")
        return
    await state.update_data(title=title)
    await state.set_state(IncidentFlow.summary)
    await message.answer("🚧 <b>Новые технические работы</b>\n\nШаг 2 из 2 · Опишите работы и возможное влияние на клиентов.", parse_mode="HTML")


@admin_required
@error_handler
async def incident_summary(message: types.Message, state: FSMContext, db_user: User, db: AsyncSession):
    summary = (message.text or "").strip()
    if not 10 <= len(summary) <= 1500:
        await message.answer("Описание должно содержать от 10 до 1500 символов.")
        return
    data = await state.get_data()
    await state.update_data(summary=summary)
    await state.set_state(IncidentFlow.confirm)
    await message.answer(
        f"👁 <b>Предпросмотр техработ</b>\n\n<b>{html.escape(data['title'])}</b>\n{html.escape(summary)}\n\nСтатус: запланировано · Затронуто: сайт",
        parse_mode="HTML", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [button("✅ Опубликовать", "site_admin_incident_publish")], [button("❌ Отмена", "site_admin_incidents")],
        ]),
    )


@admin_required
@error_handler
async def save_incident(callback: types.CallbackQuery, state: FSMContext, db_user: User, db: AsyncSession):
    data = await state.get_data()
    api = SiteAdminApi()
    payload = {**data, "severity": "info", "status": "scheduled", "planned": True, "affectedServices": ["Сайт"], "startsAt": datetime.now(timezone.utc).isoformat()}
    result = await edit_with_error(callback, lambda: api.save_incident(callback.from_user.id, payload))
    if result:
        await state.clear()
        await callback.message.edit_text("✅ <b>Технические работы опубликованы</b>\n\nЗапись появилась на странице статуса.", parse_mode="HTML", reply_markup=back_keyboard("site_admin_incidents"))
        await callback.answer("Опубликовано")


@admin_required
@error_handler
async def resolve_incident(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    incident_id = callback.data.split(":", 1)[1]
    api = SiteAdminApi()
    items = await edit_with_error(callback, lambda: api.incidents(callback.from_user.id))
    if items is None:
        return
    incident = next((item for item in items if item.get("id") == incident_id), None)
    if not incident:
        await callback.answer("Запись не найдена", show_alert=True)
        return
    payload = {**incident, "status": "resolved", "resolvedAt": datetime.now(timezone.utc).isoformat()}
    result = await edit_with_error(callback, lambda: api.save_incident(callback.from_user.id, payload))
    if result:
        await callback.answer("Работы завершены")
        await show_incidents(callback, db_user, db)


@admin_required
@error_handler
async def show_audit(callback: types.CallbackQuery, db_user: User, db: AsyncSession):
    api = SiteAdminApi()
    items = await edit_with_error(callback, lambda: api.audit(callback.from_user.id))
    if items is None:
        return
    lines = ["📜 <b>Журнал управления сайтом</b>", ""]
    lines.extend(f"• {fmt_time(item.get('createdAt'))}\n  <code>{html.escape(item.get('action', ''))}</code> · {html.escape(str(item.get('actorId', '')))}" for item in items)
    if not items:
        lines.append("Действий пока нет.")
    await callback.message.edit_text("\n".join(lines), parse_mode="HTML", reply_markup=back_keyboard())
    await callback.answer()


def register_handlers(dp: Dispatcher):
    dp.callback_query.register(show_site_admin, F.data.in_({"site_admin", "site_admin_refresh"}))
    dp.callback_query.register(show_version, F.data == "site_admin_version")
    dp.callback_query.register(show_status, F.data == "site_admin_status")
    dp.callback_query.register(show_analytics, F.data == "site_admin_analytics")
    dp.callback_query.register(show_reviews, F.data == "site_admin_reviews")
    dp.callback_query.register(show_announcements, F.data == "site_admin_announcements")
    dp.callback_query.register(start_announcement, F.data == "site_admin_announcement_new")
    dp.callback_query.register(start_announcement, F.data.startswith("site_admin_announcement_kind_"))
    dp.callback_query.register(announcement_placement, F.data.startswith("site_admin_announcement_place_"), AnnouncementFlow.placement)
    dp.callback_query.register(announcement_schedule, F.data.in_({"site_admin_announcement_schedule_now", "site_admin_announcement_schedule_later"}))
    dp.callback_query.register(save_announcement, F.data.in_({"site_admin_announcement_publish", "site_admin_announcement_draft"}), AnnouncementFlow.confirm)
    dp.callback_query.register(archive_announcement, F.data.startswith("sa_arc:"))
    dp.callback_query.register(show_incidents, F.data == "site_admin_incidents")
    dp.callback_query.register(start_incident, F.data == "site_admin_incident_new")
    dp.callback_query.register(save_incident, F.data == "site_admin_incident_publish", IncidentFlow.confirm)
    dp.callback_query.register(resolve_incident, F.data.startswith("site_admin_incident_resolve:"))
    dp.callback_query.register(show_audit, F.data == "site_admin_audit")
    dp.message.register(announcement_title, AnnouncementFlow.title)
    dp.message.register(announcement_message, AnnouncementFlow.message)
    dp.message.register(announcement_schedule_at, AnnouncementFlow.schedule_at)
    dp.message.register(incident_title, IncidentFlow.title)
    dp.message.register(incident_summary, IncidentFlow.summary)
