# Что делать, если что-то случилось

Приложение: https://gorbatovroman86-coder.github.io/pulse-planner/
Копии данных: https://github.com/gorbatovroman86-coder/pulse-planner-data (приватный)
Облако: проект **pulse-planner** в https://supabase.com/dashboard

Инструкция для человека, а не для инженера. Команды можно копировать целиком.

Все команды выполняются в папке проекта. Открыть её в терминале:

```bash
cd ~/путь/к/puls
```

Файлы копий лежат в приватном репозитории `pulse-planner-data`, папка `backups/`.
Забрать их на компьютер:

```bash
git clone git@github.com:gorbatovroman86-coder/pulse-planner-data.git ../pulse-planner-data
```

> Копия снимается каждую ночь в 03:00 по Новосибирску и коммитится персональным токеном
> владельца (`BACKUP_PAT`), а не служебным: GitHub не считает служебные коммиты активностью
> и через 60 дней глушит расписание.

---

## А. Приложение открылось пустым, данных нет

Скорее всего облако уснуло — на бесплатном тарифе Supabase проект засыпает после недели
без обращений. Данные при этом целы.

1. Открыть https://supabase.com/dashboard
2. Выбрать проект **pulse-planner**.
3. Если написано *Paused* — нажать **Restore project**.
4. Подождать 2–5 минут.
5. Обновить страницу приложения.

Если через десять минут пусто — переходи к пункту Б.

---

## Б. Облако удалено или закончилось: поднять заново

1. Создать новый проект в https://supabase.com/dashboard (регион любой бесплатный),
   имя **pulse-planner**.
2. В `Project Settings → API` скопировать **Project URL** и **anon key**,
   в `Project Settings → Database` — **Connection string**.
3. Прописать их в файл `.env` в папке проекта:

   ```bash
   SUPABASE_URL=https://новый-проект.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=service_role-ключ
   SUPABASE_DB_URL=postgresql://postgres:пароль@db.новый-проект.supabase.co:5432/postgres
   ```

4. Восстановить данные — схема накатится сама, если таблиц ещё нет:

   ```bash
   npm run restore -- ../pulse-planner-data/backups/latest.json
   ```

5. Прописать новые адрес и анонимный ключ там, где живёт сайт:

   ```bash
   gh secret set SUPABASE_URL      --repo gorbatovroman86-coder/pulse-planner
   gh secret set SUPABASE_ANON_KEY --repo gorbatovroman86-coder/pulse-planner
   gh secret set SUPABASE_SERVICE_ROLE_KEY --repo gorbatovroman86-coder/pulse-planner
   gh workflow run "Публикация на GitHub Pages" --repo gorbatovroman86-coder/pulse-planner
   ```

---

## В. Что-то удалилось по ошибке, нужно вернуть вчерашнее

1. Посмотреть, какие дни есть:

   ```bash
   ls ../pulse-planner-data/backups/
   ```

2. Взять нужный день и запустить восстановление:

   ```bash
   npm run restore -- ../pulse-planner-data/backups/2026-09-07.json
   ```

3. Обновить страницу приложения.
4. Если вернулось не то — запустить ту же команду с другой датой. Повторный запуск
   безопасен: записи обновляются по номеру, дубли не появляются.

---

## Проверить, что копии снимаются

```bash
gh run list --workflow "Ночная копия данных" --repo gorbatovroman86-coder/pulse-planner --limit 5
```

Запустить копию прямо сейчас:

```bash
gh workflow run "Ночная копия данных" --repo gorbatovroman86-coder/pulse-planner
```

---

## Зайти с нового компьютера

Открыть адрес приложения, ввести свою почту, нажать «прислать ссылку», открыть письмо
на этом же компьютере. Пароля нет, спрашивает один раз.
