import psycopg2
import os

# Попробуйте подключиться
try:
    conn = psycopg2.connect(
        dbname="portfolio_db",  
        user="kayal",
        password="bd#Tehn0l0gy",  
        host="localhost",
        port="5432"
    )
    print("✅ Подключение успешно!")
    conn.close()
except Exception as e:
    print(f"❌ Ошибка подключения: {e}")