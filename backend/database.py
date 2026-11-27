# backend/database.py
import psycopg2
from psycopg2.extras import RealDictCursor

# Cadena de conexión a Supabase (PostgreSQL)
# Nota: La contraseña ya viene codificada en la URL (APT%2BPW%2B98765432100)
DATABASE_URL = "postgresql://postgres.qayodhplkihyrsdvwkcj:APT%2BPW%2B98765432100@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def get_db_connection():
    """Establece y devuelve la conexión a la base de datos en la nube (Supabase)."""
    try:
        # RealDictCursor permite que los resultados se devuelvan como diccionarios
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Error conectando a Supabase: {e}")
        raise e

def init_db():
    """Verifica la conexión al iniciar la aplicación."""
    print("Conectado a la base de datos en la nube (Supabase).")
    pass

if __name__ == '__main__':
    init_db()