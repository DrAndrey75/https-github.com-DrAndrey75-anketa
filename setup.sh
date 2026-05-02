#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# ОртоПлатформа — автоматическая установка
# Использование: bash setup.sh
# ─────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}▶ $*${NC}"; }
success() { echo -e "${GREEN}✔ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }
error()   { echo -e "${RED}✘ $*${NC}"; exit 1; }
header()  { echo -e "\n${BOLD}═══ $* ═══${NC}\n"; }

# ─── 1. Node.js ───────────────────────────────
header "Проверка Node.js"

if ! command -v node &>/dev/null; then
  warn "Node.js не найден. Устанавливаю Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  error "Требуется Node.js 18+. Текущая версия: $(node --version)"
fi
success "Node.js $(node --version)"

# ─── 2. Firebase CLI ──────────────────────────
header "Firebase CLI"

if ! command -v firebase &>/dev/null; then
  info "Устанавливаю Firebase CLI..."
  sudo npm install -g firebase-tools
fi
success "Firebase CLI $(firebase --version)"

# ─── 3. npm зависимости ───────────────────────
header "Зависимости npm"

info "npm install..."
npm install
success "Зависимости установлены"

# ─── 4. .env.local ────────────────────────────
header "Конфигурация приложения (.env.local)"

if [ -f ".env.local" ]; then
  warn ".env.local уже существует. Пропускаю."
else
  echo "Укажите email Google-аккаунта врача-администратора."
  echo "Именно с этого аккаунта будет доступна Панель врача."
  echo ""
  read -rp "  Admin email: " ADMIN_EMAIL

  echo ""
  echo "URL-префикс для приложения."
  echo "Пример: /anketa-2025/  →  http://ВАШ_IP/anketa-2025/"
  echo "Должен начинаться и заканчиваться на /"
  read -rp "  Base path [/anketa-2025/]: " BASE_PATH
  BASE_PATH="${BASE_PATH:-/anketa-2025/}"

  cat > .env.local <<EOF
VITE_ADMIN_EMAIL="${ADMIN_EMAIL}"
VITE_BASE_PATH="${BASE_PATH}"
EOF
  success ".env.local создан"
fi

# ─── 5. firebase-config.json ──────────────────
header "Конфигурация Firebase (src/firebase-config.json)"

if [ -f "src/firebase-config.json" ]; then
  warn "src/firebase-config.json уже существует. Пропускаю."
else
  echo "Откройте https://console.firebase.google.com"
  echo "Выберите проект → Project Settings → Your apps → Web app → Config"
  echo ""

  read -rp "  Project ID:           " FB_PROJECT_ID
  read -rp "  App ID:               " FB_APP_ID
  read -rp "  Web API Key:          " FB_API_KEY
  read -rp "  Auth Domain [${FB_PROJECT_ID}.firebaseapp.com]: " FB_AUTH_DOMAIN
  FB_AUTH_DOMAIN="${FB_AUTH_DOMAIN:-${FB_PROJECT_ID}.firebaseapp.com}"
  read -rp "  Storage Bucket [${FB_PROJECT_ID}.firebasestorage.app]: " FB_STORAGE
  FB_STORAGE="${FB_STORAGE:-${FB_PROJECT_ID}.firebasestorage.app}"
  read -rp "  Messaging Sender ID:  " FB_SENDER_ID
  echo ""
  echo "Firestore Database ID."
  echo "Если не создавали кастомную базу — введите: (default)"
  read -rp "  Database ID [(default)]: " FB_DB_ID
  FB_DB_ID="${FB_DB_ID:-(default)}"

  cat > src/firebase-config.json <<EOF
{
  "projectId": "${FB_PROJECT_ID}",
  "appId": "${FB_APP_ID}",
  "apiKey": "${FB_API_KEY}",
  "authDomain": "${FB_AUTH_DOMAIN}",
  "firestoreDatabaseId": "${FB_DB_ID}",
  "storageBucket": "${FB_STORAGE}",
  "messagingSenderId": "${FB_SENDER_ID}",
  "measurementId": ""
}
EOF
  success "src/firebase-config.json создан"
fi

# Читаем projectId из конфига для firebase CLI
FB_PROJECT_ID=$(node -e "const c=require('./src/firebase-config.json'); console.log(c.projectId);")

# ─── 6. Firebase: авторизация и деплой правил ─
header "Синхронизация Firebase (правила Firestore)"

echo "Нужна авторизация в Firebase CLI."
firebase login --no-localhost 2>/dev/null || firebase login

info "Устанавливаю активный проект Firebase: ${FB_PROJECT_ID}"
firebase use "${FB_PROJECT_ID}" --add 2>/dev/null || firebase use "${FB_PROJECT_ID}"

info "Деплой правил Firestore..."
firebase deploy --only firestore:rules
success "Правила Firestore синхронизированы"

info "Деплой индексов Firestore..."
firebase deploy --only firestore:indexes
success "Индексы Firestore синхронизированы"

# ─── 7. Первый администратор ──────────────────
header "Первый администратор"

ADMIN_EMAIL_FROM_ENV=$(grep VITE_ADMIN_EMAIL .env.local | cut -d= -f2 | tr -d '"')

echo "Для входа в Панель врача нужно добавить UID администратора в коллекцию admins."
echo ""
echo "Шаги:"
echo "  1. Войдите в https://console.firebase.google.com → ваш проект"
echo "  2. Authentication → Users → найдите ${ADMIN_EMAIL_FROM_ENV}"
echo "  3. Скопируйте UID (колонка User UID)"
echo "  4. Firestore Database → Create collection: admins"
echo "     Document ID = UID из шага 3"
echo "     Добавьте поле: email (string) = ${ADMIN_EMAIL_FROM_ENV}"
echo ""
read -rp "Нажмите Enter когда сделаете → " _

# ─── 8. Сборка ────────────────────────────────
header "Сборка проекта"

npm run build
success "Сборка завершена → dist/"

# ─── 9. Nginx ─────────────────────────────────
header "Настройка Nginx"

BASE_PATH_TRIMMED=$(grep VITE_BASE_PATH .env.local | cut -d= -f2 | tr -d '"')
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if command -v nginx &>/dev/null; then
  NGINX_CONF_PATH="/etc/nginx/sites-available/ortho"

  sudo tee "${NGINX_CONF_PATH}" > /dev/null <<NGINXEOF
server {
    listen 80;
    server_name _;

    root ${SCRIPT_DIR}/dist;
    server_tokens off;

    location = / { return 404; }

    location ${BASE_PATH_TRIMMED} {
        try_files \$uri \$uri/ ${BASE_PATH_TRIMMED}index.html;
    }

    location / { return 404; }

    location ~* \.(js|css|png|jpg|svg|woff2|ico)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

  sudo ln -sf "${NGINX_CONF_PATH}" /etc/nginx/sites-enabled/ortho
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl restart nginx
  success "Nginx настроен и перезапущен"
else
  warn "Nginx не найден. Установите: sudo apt install -y nginx"
  warn "Затем запустите: bash setup.sh (шаг Nginx будет выполнен автоматически)"
fi

# ─── Итог ─────────────────────────────────────
header "Готово"

SERVER_IP=$(hostname -I | awk '{print $1}')
success "Приложение доступно по адресу:"
echo -e "\n  ${BOLD}http://${SERVER_IP}${BASE_PATH_TRIMMED}${NC}\n"
echo "Пациенты могут заходить с любого устройства по этой ссылке."
echo ""
echo "Обновление после изменений в коде:"
echo "  git pull && npm run build && sudo systemctl reload nginx"
echo ""
echo "Пересинхронизация правил Firestore:"
echo "  firebase deploy --only firestore:rules"
