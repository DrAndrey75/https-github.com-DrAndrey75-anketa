#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════
# ОртоПлатформа — полная автоматическая установка
# Использование:  bash setup.sh
# ══════════════════════════════════════════════════════════

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}▶  $*${NC}"; }
success() { echo -e "${GREEN}✔  $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }
error()   { echo -e "${RED}✘  $*${NC}"; exit 1; }
header()  { echo -e "\n${BOLD}══════════════════════════════════\n   $*\n══════════════════════════════════${NC}\n"; }
pause()   { read -rp "$(echo -e "${YELLOW}   ↳ Нажмите Enter чтобы продолжить...${NC}")" _; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ══ 1. Системные пакеты ══════════════════════════════════
header "1/9 · Системные пакеты"

info "Обновляю apt..."
sudo apt-get update -qq

# Node.js
if ! command -v node &>/dev/null || [ "$(node --version | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  info "Устанавливаю Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - -qq
  sudo apt-get install -y nodejs -qq
fi
success "Node.js $(node --version)"

# Nginx
if ! command -v nginx &>/dev/null; then
  info "Устанавливаю Nginx..."
  sudo apt-get install -y nginx -qq
fi
success "Nginx $(nginx -v 2>&1 | grep -o '[0-9.]*$')"

# ufw
if ! command -v ufw &>/dev/null; then
  sudo apt-get install -y ufw -qq
fi

# Firebase CLI
if ! command -v firebase &>/dev/null; then
  info "Устанавливаю Firebase CLI..."
  sudo npm install -g firebase-tools --quiet
fi
success "Firebase CLI $(firebase --version)"

# ══ 2. npm зависимости ═══════════════════════════════════
header "2/9 · npm зависимости"
npm install
success "Зависимости установлены"

# ══ 3. Переменные окружения (.env.local) ═════════════════
header "3/9 · Настройка приложения (.env.local)"

if [ -f ".env.local" ]; then
  warn ".env.local уже существует — пропускаю."
else
  echo "  Email Google-аккаунта врача (именно с него будет доступна Панель врача):"
  read -rp "  Admin email: " ADMIN_EMAIL

  echo ""
  echo "  URL-путь к приложению, например  /anketa-2025/"
  echo "  Пациенты будут заходить:  http://$(hostname -I | awk '{print $1}')/anketa-2025/"
  echo "  Должен начинаться и заканчиваться на /"
  read -rp "  Base path [/anketa-2025/]: " BASE_PATH
  BASE_PATH="${BASE_PATH:-/anketa-2025/}"

  cat > .env.local <<EOF
VITE_ADMIN_EMAIL="${ADMIN_EMAIL}"
VITE_BASE_PATH="${BASE_PATH}"
EOF
  success ".env.local создан"
fi

# ══ 4. Firebase-конфиг ═══════════════════════════════════
header "4/9 · Firebase-конфиг (src/firebase-config.json)"

if [ -f "src/firebase-config.json" ]; then
  warn "src/firebase-config.json уже существует — пропускаю."
else
  echo "  Откройте: https://console.firebase.google.com"
  echo "  Выберите проект → ⚙ Project Settings → Your apps → Web app → Config"
  echo "  Скопируйте значения и вставьте ниже:"
  echo ""
  read -rp "  projectId:          " FB_PROJECT_ID
  read -rp "  appId:              " FB_APP_ID
  read -rp "  apiKey:             " FB_API_KEY
  read -rp "  authDomain [${FB_PROJECT_ID}.firebaseapp.com]: " FB_AUTH_DOMAIN
  FB_AUTH_DOMAIN="${FB_AUTH_DOMAIN:-${FB_PROJECT_ID}.firebaseapp.com}"
  read -rp "  storageBucket [${FB_PROJECT_ID}.firebasestorage.app]: " FB_STORAGE
  FB_STORAGE="${FB_STORAGE:-${FB_PROJECT_ID}.firebasestorage.app}"
  read -rp "  messagingSenderId:  " FB_SENDER_ID
  read -rp "  Firestore DB ID [(default)]: " FB_DB_ID
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

FB_PROJECT_ID=$(node -e "process.stdout.write(require('./src/firebase-config.json').projectId)")
SERVER_IP=$(hostname -I | awk '{print $1}')
BASE_PATH_VAL=$(grep VITE_BASE_PATH .env.local | cut -d= -f2 | tr -d '"')

# ══ 5. Google Auth в Firebase ════════════════════════════
header "5/9 · Включение Google Sign-In в Firebase"

echo "  Это нужно сделать один раз вручную (Firebase CLI не умеет это автоматизировать)."
echo ""
echo -e "  ${BOLD}Шаги:${NC}"
echo "  1. Откройте: https://console.firebase.google.com/project/${FB_PROJECT_ID}/authentication/providers"
echo "  2. Нажмите «Google» → Enable → Save"
echo ""
echo "  3. Добавьте ваш IP как авторизованный домен:"
echo "     https://console.firebase.google.com/project/${FB_PROJECT_ID}/authentication/settings"
echo "     Authorized domains → Add domain → введите: ${SERVER_IP}"
echo ""
pause

# ══ 6. Firebase CLI: авторизация и деплой ════════════════
header "6/9 · Синхронизация Firebase (правила и индексы)"

echo "  Требуется войти в Firebase CLI."
echo "  Если браузер недоступен на этом сервере — выберите вариант с кодом."
echo ""
firebase login --no-localhost || firebase login

info "Активирую проект: ${FB_PROJECT_ID}"
firebase use "${FB_PROJECT_ID}" 2>/dev/null || firebase use --add

info "Деплой правил Firestore..."
firebase deploy --only firestore:rules
success "Правила Firestore обновлены"

info "Деплой индексов Firestore..."
firebase deploy --only firestore:indexes
success "Индексы Firestore обновлены"

# ══ 7. Сборка ════════════════════════════════════════════
header "7/9 · Сборка проекта"

npm run build
success "Сборка завершена → dist/"

# ══ 8. Nginx ═════════════════════════════════════════════
header "8/9 · Nginx — изолированный веб-сервер"

NGINX_CONF="/etc/nginx/sites-available/ortho"

sudo tee "${NGINX_CONF}" > /dev/null <<NGINXEOF
server {
    listen 80;
    server_name _;

    # ── Корень строго = папка сборки. Снаружи ничего не видно ──
    root ${SCRIPT_DIR}/dist;
    server_tokens off;

    # Запросы на корень → 404 (скрываем сервер)
    location = / { return 404; }

    # Только этот путь работает для пациентов
    location ${BASE_PATH_VAL} {
        try_files \$uri \$uri/ ${BASE_PATH_VAL}index.html;
    }

    # Всё остальное → 404
    location / { return 404; }

    # Кэш статики
    location ~* \.(js|css|png|jpg|svg|woff2|ico)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

sudo ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/ortho
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
success "Nginx настроен и запущен"

# ══ 8b. Firewall ══════════════════════════════════════════
info "Настройка firewall (ufw)..."
sudo ufw allow 22/tcp   comment 'SSH'  2>/dev/null || true
sudo ufw allow 80/tcp   comment 'HTTP' 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true
success "Firewall: порты 22 (SSH) и 80 (HTTP) открыты"

# ══ 9. Первый администратор ══════════════════════════════
header "9/9 · Регистрация первого администратора"

ADMIN_EMAIL_VAL=$(grep VITE_ADMIN_EMAIL .env.local | cut -d= -f2 | tr -d '"')

echo "  Сначала врач должен хотя бы раз войти в приложение через Google."
echo ""
echo "  1. Откройте в браузере:"
echo -e "     ${BOLD}http://${SERVER_IP}${BASE_PATH_VAL}${NC}"
echo "     Нажмите «Вход для врача» и войдите как ${ADMIN_EMAIL_VAL}"
echo ""
echo "  2. После входа перейдите в Firebase Console:"
echo "     https://console.firebase.google.com/project/${FB_PROJECT_ID}/authentication/users"
echo "     Найдите ${ADMIN_EMAIL_VAL} → скопируйте User UID"
echo ""
echo "  3. Откройте Firestore:"
echo "     https://console.firebase.google.com/project/${FB_PROJECT_ID}/firestore/data"
echo "     + Start collection → ID: admins"
echo "     + Add document → Document ID = UID из шага 2"
echo "     + Add field: email (string) = ${ADMIN_EMAIL_VAL}"
echo ""
echo "  После этого при следующем входе врач автоматически увидит Панель врача."
echo ""
pause

# ══ Итог ═════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════"
echo "  Установка завершена успешно!"
echo -e "════════════════════════════════════${NC}"
echo ""
echo -e "  Ссылка для пациентов:"
echo -e "  ${BOLD}http://${SERVER_IP}${BASE_PATH_VAL}${NC}"
echo ""
echo "  ─ Что защищено ─────────────────────────────────"
echo "  ✔ Nginx отдаёт файлы ТОЛЬКО из: ${SCRIPT_DIR}/dist"
echo "  ✔ Все другие пути на сервере → 404"
echo "  ✔ Пациенты не могут читать чужие данные (правила Firestore)"
echo "  ✔ Только один врач имеет доступ к результатам"
echo ""
echo "  ─ Обновление кода ───────────────────────────────"
echo "  git pull && npm run build && sudo systemctl reload nginx"
echo ""
echo "  ─ Повторная синхронизация правил БД ─────────────"
echo "  firebase deploy --only firestore:rules"
echo ""
