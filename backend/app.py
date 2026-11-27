# backend/app.py
import sqlite3
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
from componentes import Validador, Respuesta
from database import get_db_connection, init_db

app = Flask(__name__)
app.secret_key = 'super_secret_key_apt_2026'
CORS(app, supports_credentials=True)
init_db()

# Decorador para verificar Admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('rol') != 'admin':
            return Respuesta.error("Acceso denegado. Se requiere rol de administrador.", 403)
        return f(*args, **kwargs)
    return decorated_function

# --- LOGIN Y LOGOUT ---
@app.route('/api/login', methods=['POST'])
def login():
    datos = request.get_json()
    correo = datos.get('correo')
    password = datos.get('password')
    
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM usuarios WHERE correo = ?", (correo,)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['rol'] = user['rol']
        session['correo'] = user['correo']
        return Respuesta.exito("Login exitoso", {"rol": user['rol'], "correo": user['correo']})
    return Respuesta.error("Correo o contraseña incorrectos", 401)

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return Respuesta.exito("Sesión cerrada")

# --- SALIDAS (CONSULTA) ---
@app.route('/api/salidas/<destino>', methods=['GET'])
def obtener_salidas(destino):
    conn = get_db_connection()
    salidas = conn.execute("SELECT * FROM salidas WHERE destino = ? AND asientos_disponibles > 0", (destino,)).fetchall()
    conn.close()
    return Respuesta.exito("Salidas disponibles", [dict(s) for s in salidas])

# --- GUARDAR RESERVA COMPLETA (PÚBLICO) ---
@app.route('/api/guardar_reserva_completa', methods=['POST'])
def guardar_reserva_completa():
    datos = request.get_json()
    nombre = datos.get('nombre', '').strip()
    correo = datos.get('correo', '').strip()
    edad = datos.get('edad', 18) 
    destino = datos.get('destino')
    fecha = datos.get('fecha')
    pasajeros = int(datos.get('pasajeros', 1))
    total = float(datos.get('total', 0))
    habitacion = datos.get('habitacion', 'Sencilla')
    descuento = float(datos.get('descuento', 0))
    acompanantes = datos.get('acompanantes', [])

    if not all([nombre, correo, destino, fecha]):
        return Respuesta.error("Faltan datos obligatorios.")
    
    try:
        edad_int = int(edad)
        if edad_int < 18 or edad_int > 120:
            return Respuesta.error("La edad debe estar entre 18 y 120 años.")
    except:
        return Respuesta.error("La edad debe ser un número válido.")

    conn = get_db_connection()
    try:
        # 1. Validar Cupo
        salida = conn.execute("SELECT * FROM salidas WHERE destino = ? AND fecha_salida = ?", (destino, fecha)).fetchone()
        if not salida or salida['asientos_disponibles'] < pasajeros:
            return Respuesta.error("No hay suficientes asientos disponibles para esta fecha.", 400)

        # 2. Obtener o crear cliente
        cliente = conn.execute("SELECT id FROM clientes WHERE correo = ?", (correo,)).fetchone()
        if cliente:
            id_cliente = cliente['id']
        else:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO clientes (nombre, correo, edad) VALUES (?, ?, ?)", (nombre, correo, edad_int))
            id_cliente = cursor.lastrowid

        # 3. Crear Reserva
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO reservas (id_cliente, id_salida, destino, fecha_viaje, habitacion, num_pasajeros, total_pagado, descuento_aplicado, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
        ''', (id_cliente, salida['id'], destino, fecha, habitacion, pasajeros, total, descuento))
        id_reserva = cursor.lastrowid

        # 4. Guardar Acompañantes
        for ac in acompanantes:
            conn.execute("INSERT INTO acompanantes (id_reserva, nombre, edad) VALUES (?, ?, ?)", (id_reserva, ac['nombre'], ac['edad']))

        # 5. Descontar asientos
        conn.execute("UPDATE salidas SET asientos_disponibles = asientos_disponibles - ? WHERE id = ?", (pasajeros, salida['id']))
        
        conn.commit()
        return Respuesta.exito("Reserva guardada exitosamente", {"id_reserva": id_reserva})
    
    except sqlite3.IntegrityError:
        return Respuesta.error("Ya tienes una reserva para esta salida.", 409)
    except Exception as e:
        return Respuesta.error(f"Error al guardar: {str(e)}", 500)
    finally:
        conn.close()

# --- RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ---
@app.route('/api/clientes', methods=['GET'])
@admin_required
def obtener_clientes():
    conn = get_db_connection()
    query = '''
        SELECT c.id, c.nombre, c.correo, c.edad, 
               r.id AS id_reserva, r.destino, r.fecha_viaje, r.num_pasajeros, r.total_pagado, r.estado
        FROM clientes c
        LEFT JOIN reservas r ON c.id = r.id_cliente
        ORDER BY c.id DESC
    '''
    resultados = conn.execute(query).fetchall()
    conn.close()
    return Respuesta.exito("Lista de clientes obtenida", [dict(row) for row in resultados])

@app.route('/api/clientes', methods=['POST'])
@admin_required
def crear_cliente():
    datos = request.get_json()
    nombre = datos.get('nombre', '').strip()
    correo = datos.get('correo', '').strip()
    edad = datos.get('edad', 0)

    if not Validador.validar_nombre(nombre): return Respuesta.error("Nombre inválido.")
    if not Validador.validar_correo(correo): return Respuesta.error("Correo inválido.")
    try:
        edad_int = int(edad)
        if edad_int < 18 or edad_int > 120: return Respuesta.error("Edad fuera de rango.")
    except: return Respuesta.error("Edad inválida.")

    conn = get_db_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM clientes").fetchone()[0]
        if count >= 50: return Respuesta.error("Límite de 50 clientes alcanzado.", 400)

        cursor = conn.cursor()
        cursor.execute("INSERT INTO clientes (nombre, correo, edad) VALUES (?, ?, ?)", (nombre, correo, edad_int))
        conn.commit()
        return Respuesta.exito("Cliente registrado", {"id": cursor.lastrowid})
    except sqlite3.IntegrityError:
        return Respuesta.error("El correo ya está registrado.", 409)
    finally:
        conn.close()

@app.route('/api/clientes/<int:id>', methods=['PUT', 'DELETE'])
@admin_required
def modificar_cliente(id):
    if request.method == 'DELETE':
        conn = get_db_connection()
        conn.execute("DELETE FROM clientes WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return Respuesta.exito("Cliente eliminado")
        
    datos = request.get_json()
    conn = get_db_connection()
    try:
        conn.execute("UPDATE clientes SET nombre=?, correo=?, edad=? WHERE id=?", 
                     (datos['nombre'], datos['correo'], int(datos['edad']), id))
        conn.commit()
        return Respuesta.exito("Cliente actualizado")
    except sqlite3.IntegrityError:
        return Respuesta.error("El correo ya está en uso.", 409)
    finally:
        conn.close()

@app.route('/api/reservas', methods=['GET'])
@admin_required
def obtener_reservas():
    conn = get_db_connection()
    reservas = conn.execute('''
        SELECT r.id, r.destino, r.fecha_viaje, r.num_pasajeros, r.total_pagado, r.estado, r.habitacion,
               c.nombre AS nombre_cliente, c.correo AS correo_cliente
        FROM reservas r
        JOIN clientes c ON r.id_cliente = c.id
    ''').fetchall()
    conn.close()
    return Respuesta.exito("Lista de reservas", [dict(r) for r in reservas])

if __name__ == '__main__':
    app.run(debug=True, port=5000)