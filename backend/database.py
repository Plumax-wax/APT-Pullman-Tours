# backend/database.py
import sqlite3
from werkzeug.security import generate_password_hash

DATABASE_NAME = 'apt_database.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Tabla de Clientes
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        correo TEXT NOT NULL UNIQUE,
        edad INTEGER NOT NULL
    )
    ''')
    
    # 2. Tabla de Usuarios (Login)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        correo TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('cliente', 'admin'))
    )
    ''')
    
    # 3. Tabla de Salidas (Control de Cupo)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS salidas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destino TEXT NOT NULL,
        fecha_salida TEXT NOT NULL,
        asientos_totales INTEGER NOT NULL,
        asientos_disponibles INTEGER NOT NULL,
        UNIQUE(destino, fecha_salida)
    )
    ''')
    
    # 4. Tabla de Reservas
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cliente INTEGER NOT NULL,
        id_salida INTEGER NOT NULL,
        destino TEXT NOT NULL,
        fecha_viaje TEXT NOT NULL,
        habitacion TEXT NOT NULL,
        num_pasajeros INTEGER NOT NULL,
        total_pagado REAL,
        descuento_aplicado REAL DEFAULT 0,
        estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagada', 'cancelada')),
        fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES clientes (id) ON DELETE CASCADE,
        FOREIGN KEY (id_salida) REFERENCES salidas (id),
        UNIQUE(id_cliente, id_salida)
    )
    ''')
    
    # 5. Tabla de Acompañantes
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS acompanantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_reserva INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        edad INTEGER NOT NULL,
        FOREIGN KEY (id_reserva) REFERENCES reservas (id) ON DELETE CASCADE
    )
    ''')

    # Insertar Admin por defecto si no existe
    try:
        cursor.execute("INSERT INTO usuarios (correo, password_hash, rol) VALUES (?, ?, ?)",
                       ("admin@apt.com", generate_password_hash("admin123"), "admin"))
    except sqlite3.IntegrityError:
        pass

    # Insertar Salidas de prueba si no existen
    salidas_prueba = [
        ("Valle de Bravo", "2026-12-15", 40, 40),
        ("Taxco", "2026-12-20", 30, 30),
        ("Puebla", "2026-12-10", 50, 50),
        ("Acapulco", "2026-12-25", 40, 40),
        ("Sierra Tarahumara", "2027-01-29", 20, 20),
        ("Machu Picchu", "2027-09-08", 15, 15)
    ]
    for s in salidas_prueba:
        try:
            cursor.execute("INSERT INTO salidas (destino, fecha_salida, asientos_totales, asientos_disponibles) VALUES (?, ?, ?, ?)", s)
        except sqlite3.IntegrityError:
            pass

    conn.commit()
    conn.close()
    print("Base de datos lista (con usuarios, salidas y reservas).")