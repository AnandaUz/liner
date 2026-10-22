# Глоссарий проекта Liner

## Доска графиков / Desk (Chart Canvas)
Интерактивный координатный SVG-холст для визуализации динамики веса, трендов и целевых прогнозов с поддержкой drag & zoom.
- **Mapping:**
  - Logic: [Desk](file:///d:/_sites/liner/client/src/components/c-desk/Desk.ts#L59)
  - View: [CDesk](file:///d:/_sites/liner/client/src/components/c-desk/c-desk.ts#L8), [c-desk.scss](file:///d:/_sites/liner/client/src/components/c-desk/c-desk.scss)
  - Data: [getWeightLog](file:///d:/_sites/liner/client/src/services/weightLog.service.ts#L6)
- **Lifecycle:**
  1. Создание контейнера DOM и инициализация SVG/тултипа (`initSvg`, `initTooltip`, `initDrag`).
  2. Загрузка массива логов `weightLogs` и расчёт базовых метрик (min/max вес, даты, LOESS-кривые).
  3. Рендеринг SVG-сетки, фоновых шкал, полилиний и интерактивных точек (`render`).
  4. Центрирование холста на последних днях (`setStartPosition`).
  5. Обработка пользовательских событий (drag, wheel zoom, mouseover tooltip).

## Запись веса / Weight Log
Ежедневная атомарная запись измерений веса пользователя с опциональным текстовым комментарием.
- **Mapping:**
  - Logic: [WeightLog Controller](file:///d:/_sites/liner/server/src/controllers/weightLog.controller.ts#L4), [addWeight](file:///d:/_sites/liner/server/src/bot.ts#L73)
  - View: [CDesk](file:///d:/_sites/liner/client/src/components/c-desk/c-desk.ts#L8)
  - DB/Manager: [WeightLog Model](file:///d:/_sites/liner/server/src/models/WeightLog.ts#L26), [IWeightLog](file:///d:/_sites/liner/shared/types/weightLog.ts#L1)
- **Lifecycle:**
  1. Ввод пользователем в Telegram-боте (`66.5`, `12 66.5 [коммент]`) либо импорт через скрипты.
  2. Парсинг даты, валидация веса и извлечение комментария в [parseDateToken](file:///d:/_sites/liner/server/src/bot.ts#L378).
  3. Upsert в коллекцию `weightlogs` по составному ключу `{ userId, date }`.
  4. Получение отсортированного списка записей через API `GET /api/weightLog/:id`.
  5. Кэширование на клиенте и построение графика.

## Пользователь / User
Учётная запись участника системы, связывающая Google OAuth профиль, Telegram ID, цели и настройки приватности.
- **Mapping:**
  - Logic: [User Controller](file:///d:/_sites/liner/server/src/controllers/user.controller.ts#L5), [Auth Controller](file:///d:/_sites/liner/server/src/controllers/auth.controller.ts#L8)
  - View: [User Page](file:///d:/_sites/liner/client/src/pages/user.ts#L6), [CUsersList](file:///d:/_sites/liner/client/src/components/c-users-list/c-users-list.ts#L5), [CUserMenu](file:///d:/_sites/liner/client/src/components/c-user-menu/c-user-menu.ts#L3)
  - DB/Manager: [User Model](file:///d:/_sites/liner/server/src/models/User.ts#L81), [IUser](file:///d:/_sites/liner/shared/types/user.ts#L9)
- **Lifecycle:**
  1. Авторизация через Google One-Tap / Identity Services.
  2. Создание документа в `users` с флагом `isRegistered: false` и при необходимости онбординг на `/register`.
  3. Привязка Telegram-аккаунта по deeplink `/start <userId>`.
  4. Настройка целей и публичности страницы в `settings`.

## Цель / Goal
Целевой ориентир массы тела пользователя с начальным весом, целевым весом и датами старта/окончания.
- **Mapping:**
  - Logic: [User Schema](file:///d:/_sites/liner/server/src/schemas/user.schema.ts#L4), [Desk Goal Calc](file:///d:/_sites/liner/client/src/components/c-desk/Desk.ts#L283)
  - View: [Settings Page](file:///d:/_sites/liner/client/src/pages/settings.ts#L3)
  - DB/Manager: [IGoal](file:///d:/_sites/liner/shared/types/user.ts#L1), embedded в [User Model](file:///d:/_sites/liner/server/src/models/User.ts#L7)
- **Lifecycle:**
  1. Определение параметров цели (title, targetWeight, startWeight, endDate) в профиле пользователя.
  2. Сохранение в массив `user.settings.goals`.
  3. Использование целевого веса для расчёта срока достижения через производную тренда на графике.

## Сглаживание LOESS / LOESS Smoothing
Алгоритм локально взвешенной полиномиальной регрессии для фильтрации суточных колебаний веса и выявления среднесрочного тренда.
- **Mapping:**
  - Logic: [Desk.loess](file:///d:/_sites/liner/client/src/components/c-desk/Desk.ts#L793)
  - View: SVG Polyline в [Desk.render](file:///d:/_sites/liner/client/src/components/c-desk/Desk.ts#L486)
- **Lifecycle:**
  1. Построение непрерывного массива точек с интерполяцией пропущенных дней.
  2. Применение трикубической весовой функции в скользящем окне (15 и 45 дней).
  3. Вычисление коэффициентов взвешенного МНК $y = a + b \cdot x$.
  4. Формирование сглаженных кривых `graphs[1]` и `graphs[2]` для отрисовки.

## Касательная тренда / Trend Tangent
Вектор текущей скорости изменения веса (кг/день, г/нед, г/мес) и прогноз даты достижения цели на базе 45-дневного LOESS.
- **Mapping:**
  - Logic: [Desk.drawTangent](file:///d:/_sites/liner/client/src/components/c-desk/Desk.ts#L561)
  - View: [createPoint_kosatelnay](file:///d:/_sites/liner/client/src/components/c-desk/Desk.ts#L264), `#tangent-line`
- **Lifecycle:**
  1. Вычисление численной производной в точке касания по центральной разности: $(w_{next} - w_{prev}) / 2$.
  2. Пересчёт производной в экранные координаты с учётом обратной оси Y.
  3. Построение отрезка касательной на SVG-холсте.
  4. Расчёт прогнозируемого количества дней до достижения целевого веса $\Delta w / v_{day}$.
  5. Отображение прогноза и скорости в тултипе.

## Бот Telegram / Telegram Bot
Интерфейс оперативного ввода данных, получения обратной связи по динамике веса и рассылок.
- **Mapping:**
  - Logic: [bot](file:///d:/_sites/liner/server/src/bot.ts#L8), [Telegram Controller](file:///d:/_sites/liner/server/src/controllers/telegram.controller.ts#L4)
  - Routes: [telegram.routes.ts](file:///d:/_sites/liner/server/src/routes/telegram.routes.ts#L5)
  - DB/Manager: [User.telegramId](file:///d:/_sites/liner/server/src/models/User.ts#L39)
- **Lifecycle:**
  1. Запуск бота через Webhook `/api/telegram/webhook`.
  2. Привязка к аккаунту через `/start <userId>`.
  3. Приём текстового сообщения, расчёт разницы с предыдущим замером и удаление исходного сообщения юзера.
  4. Обновление фиксированного сообщения-статуса бота или отправка нового.
  5. Оповещение администратора о новом замере.

## Авторизация и Сессия / Auth & Session
Двухуровневая система аутентификации на основе Google OAuth2 и связки JWT Access/Refresh токенов.
- **Mapping:**
  - Logic: [auth.service.ts](file:///d:/_sites/liner/client/src/services/auth.service.ts#L38), [auth.controller.ts](file:///d:/_sites/liner/server/src/controllers/auth.controller.ts#L8), [jwt.ts](file:///d:/_sites/liner/server/src/utils/jwt.ts#L14)
  - Middleware: [auth.middleware.ts](file:///d:/_sites/liner/server/src/middleware/auth.middleware.ts#L8), [auth.guard.ts](file:///d:/_sites/liner/client/src/services/auth.guard.ts#L4)
- **Lifecycle:**
  1. Передача Google Identity credential на сервер `/api/auth/google`.
  2. Генерация пары `token` (15 мин) и `refreshToken` (30 дней).
  3. Сохранение токенов в `localStorage` и проверка валидности в [authGuard](file:///d:/_sites/liner/client/src/services/auth.guard.ts#L4).
  4. Автоматическая ротация Access токена через `/api/auth/refresh` при получении 401 в [fetchWithAuth](file:///d:/_sites/liner/client/src/services/api.ts#L8).
  5. Сброс сессии при выходе или протухании Refresh токена.

## Напоминания / Reminders
Сервисный эндпоинт фонового контроля за регулярностью взвешивания пользователей.
- **Mapping:**
  - Logic: [doReminder](file:///d:/_sites/liner/server/src/bot.ts#L274)
  - Routes: [telegram.routes.ts](file:///d:/_sites/liner/server/src/routes/telegram.routes.ts#L10)
  - DB/Manager: [User.botMessage](file:///d:/_sites/liner/server/src/models/User.ts#L67)
- **Lifecycle:**
  1. Вызов защищённого эндпоинта по паролю внешним планировщиком/cron.
  2. Выборка пользователей с `telegramId` и их последних записей веса за 30 дней через MongoDB aggregation.
  3. Фильтрация тех, кто не вносил замер сегодня.
  4. Удаление предыдущего сервисного сообщения и отправка персонального напоминания с числом пропущенных дней.
  5. Сохранение `messageId` нового сообщения в документе пользователя.
