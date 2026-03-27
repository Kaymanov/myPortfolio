#!/bin/bash
# Сохраните как setup_postgres.sh

echo "Проверка PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL не найден. Установка..."
    sudo apt update && sudo apt install postgresql postgresql-contrib
    sudo systemctl start postgresql
else
    echo "PostgreSQL уже установлен: $(psql --version)"
fi

echo "Существующие базы данных:"
sudo -u postgres psql -c "\l"

echo "Создание новой БД для Django..."
read -p "Введите имя базы данных: " db_name
read -p "Введите имя пользователя: " db_user
read -sp "Введите пароль: " db_pass
echo

sudo -u postgres psql <<EOF
CREATE USER $db_user WITH PASSWORD '$db_pass';
CREATE DATABASE $db_name OWNER $db_user;
GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;
EOF

echo "База данных $db_name успешно создана!"
