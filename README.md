# ОртоПлатформа

Система цифрового анкетирования пациентов перед ортопедическим приёмом.  
Поддерживаемые шкалы: **VAS · CONSTANT · ASES · QuickDASH · UCLA · WORC**

---

## Быстрый старт (Ubuntu)

```bash
git clone https://github.com/DrAndrey75/https-github.com-DrAndrey75-anketa ortho
cd ortho
bash setup.sh
```

Скрипт сам:
- проверит и установит Node.js 22, Firebase CLI
- установит npm-зависимости
- создаст `.env.local` (спросит email врача и URL-префикс)
- создаст `src/firebase-config.json` (спросит параметры Firebase)
- задеплоит правила и индексы Firestore
- соберёт проект
- настроит и перезапустит Nginx

---

## Ручная установка (шаг за шагом)

### 1. Зависимости

```bash
npm install
sudo npm install -g firebase-tools
```

### 2. Переменные окружения

```bash
cp .env.example .env.local
```

Отредактируйте `.env.local`:

```env
VITE_ADMIN_EMAIL="ваш_google@gmail.com"
VITE_BASE_PATH="/anketa-2025/"
```

### 3. Firebase-конфиг

```bash
cp src/firebase-config.example.json src/firebase-config.json
```

Заполните `src/firebase-config.json` данными из  
Firebase Console → Project Settings → Your apps → Web app → Config.

### 4. Синхронизация базы данных

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules     # правила доступа
firebase deploy --only firestore:indexes   # индексы запросов
```

### 5. Первый администратор

1. Войдите в своё приложение через Google
2. Firebase Console → Authentication → Users → скопируйте UID
3. Firebase Console → Firestore → Create collection: `admins`
   - Document ID = UID из шага 2
   - Поле: `email` (string) = ваш email

### 6. Сборка и запуск

```bash
npm run build           # → dist/
npm run dev             # dev-сервер на localhost:3000
```

---

## Nginx (production)

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/ortho/dist;
    server_tokens off;

    location = / { return 404; }

    location /anketa-2025/ {
        try_files $uri $uri/ /anketa-2025/index.html;
    }

    location / { return 404; }
}
```

---

## Добавление новой шкалы

1. Добавьте тип в `src/types.ts`:

```ts
export type ScaleType = 'VAS' | ... | 'НОВАЯ_ШКАЛА';
```

2. Добавьте определение в `src/constants/scales.ts`:

```ts
{
  id: 'НОВАЯ_ШКАЛА',
  title: 'Название',
  description: 'Описание',
  calculateScore: (responses) => { /* формула */ },
  sections: [{
    title: 'Раздел',
    questions: [
      { id: 'q1', text: 'Вопрос', type: 'slider', minLabel: 'Мин', maxLabel: 'Макс' }
    ]
  }]
}
```

Всё остальное (рендеринг, сохранение, экспорт) работает автоматически.

---

## Обновление после изменений

```bash
git pull
npm run build
sudo systemctl reload nginx

# Если изменились firestore.rules или firestore.indexes.json:
firebase deploy --only firestore:rules,firestore.indexes
```

---

## Структура проекта

```
src/
  App.tsx                      — UI: home | form | admin | success
  firebase.ts                  — инициализация Firebase
  firebase-config.json         — конфиг Firebase (не коммитить)
  firebase-config.example.json — шаблон
  types.ts                     — типы TypeScript
  constants/scales.ts          — определения шкал
firestore.rules                — правила безопасности Firestore
firestore.indexes.json         — индексы Firestore
firebase.json                  — конфиг Firebase CLI
setup.sh                       — автоустановка
.env.example                   — шаблон переменных
.cursor/rules/project.mdc      — правила для Cursor AI
```
