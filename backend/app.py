# backend/app.py
import re
import math
import requests # <-- Necesario para la Actividad 4
import psycopg2
from datetime import datetime, date
from flask import Flask, request, jsonify
from flask_cors import CORS
from componentes import Respuesta
from database import get_db_connection, init_db

app = Flask(__name__)
CORS(app)
init_db()

# ---------------- VALIDACIONES ----------------
LETRA = r"A-Za-zÁÉÍÓÚáéíóúÑñÜü"
RE_NOMBRE = re.compile(rf"^[{LETRA}]+(?: [{LETRA}]+)*$")
RE_CORREO = re.compile(r"^[A-Za-z0-9._-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")
DESTINOS_VALIDOS = {"Valle de Bravo", "Taxco", "Puebla", "Acapulco", "Sierra Tarahumara", "Machu Picchu"}
MAX_CLIENTES = 50

def texto(valor):
    return str(valor if valor is not None else "").strip()

def validar_cliente(datos):
    nombre = " ".join(texto(datos.get("nombre")).split())
    correo = texto(datos.get("correo")).lower()

    if not (2 <= len(nombre) <= 100) or not RE_NOMBRE.match(nombre):
        return "El nombre solo debe contener letras y espacios (mínimo 2).", None
    if len(correo) > 100 or not RE_CORREO.match(correo):
        return "El correo es inválido (un solo @, sin símbolos raros).", None
    try:
        edad = int(datos.get("edad"))
    except (ValueError, TypeError):
        return "La edad debe ser un número válido.", None
    if edad < 18 or edad > 120:
        return "La edad debe estar entre 18 y 120 años.", None
    return None, (nombre, correo, edad)

def validar_viaje(datos, clave_pasajeros="num_pasajeros", clave_total="total_pagado", clave_fecha="fecha_viaje", fecha_obligatoria=False):
    destino = texto(datos.get("destino"))
    if destino not in DESTINOS_VALIDOS:
        return "Destino inválido.", None

    fecha = texto(datos.get(clave_fecha)) or None
    if fecha_obligatoria and not fecha:
        return "La fecha del viaje es obligatoria.", None
    if fecha:
        try:
            datetime.strptime(fecha, "%Y-%m-%d")
        except ValueError:
            return "Fecha inválida (formato AAAA-MM-DD).", None

    try:
        pasajeros = int(datos.get(clave_pasajeros, 1))
    except (ValueError, TypeError):
        return "El número de pasajeros debe ser un número.", None
    if pasajeros < 1 or pasajeros > 50:
        return "Los pasajeros deben estar entre 1 y 50.", None

    try:
        total = float(datos.get(clave_total, 0))
    except (ValueError, TypeError):
        return "El total debe ser un número válido.", None
    if math.isnan(total) or math.isinf(total) or total < 0:
        return "El total debe ser 0 o mayor.", None

    return None, (destino, fecha, pasajeros, total)


# --- CREAR CLIENTE ---
@app.route('/api/clientes', methods=['POST'])
def crear_cliente():
    datos = request.get_json(silent=True) or {}
    error, valores = validar_cliente(datos)
    if error:
        return Respuesta.error(error)
    nombre, correo, edad = valores

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total FROM clientes")
        count = cursor.fetchone()['total']
        
        if count >= MAX_CLIENTES:
            return Respuesta.error("Límite de usuarios alcanzado.", 400)

        cursor.execute("INSERT INTO clientes (nombre, correo, edad) VALUES (%s, %s, %s) RETURNING id", (nombre, correo, edad))
        nuevo_id = cursor.fetchone()['id']
        conn.commit()
        return Respuesta.exito("Cliente registrado exitosamente", {"id": nuevo_id})
    except psycopg2.IntegrityError:
        conn.rollback()
        return Respuesta.error("El correo ya está registrado.", 409)
    finally:
        conn.close()


# --- LEER TODOS LOS CLIENTES ---
@app.route('/api/clientes', methods=['GET'])
def obtener_clientes():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT c.id, c.nombre, c.correo, c.edad,
                   r.id AS id_reserva, r.destino, r.fecha_viaje, r.num_pasajeros, r.total_pagado
            FROM clientes c
            LEFT JOIN reservas r ON c.id = r.id_cliente
            ORDER BY c.id DESC
        ''')
        resultados = cursor.fetchall()
        return Respuesta.exito("Lista de clientes obtenida", [dict(row) for row in resultados])
    finally:
        conn.close()


# --- LEER UN CLIENTE ---
@app.route('/api/clientes/<int:id>', methods=['GET'])
def obtener_cliente_por_id(id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clientes WHERE id = %s", (id,))
        cliente = cursor.fetchone()
        if cliente is None:
            return Respuesta.error("Cliente no encontrado", 404)
        return Respuesta.exito("Cliente encontrado", dict(cliente))
    finally:
        conn.close()


# --- ACTUALIZAR CLIENTE ---
@app.route('/api/clientes/<int:id>', methods=['PUT'])
def actualizar_cliente(id):
    datos = request.get_json(silent=True) or {}
    error, valores = validar_cliente(datos)
    if error:
        return Respuesta.error(error)
    nombre, correo, edad = valores

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clientes WHERE id = %s", (id,))
        if cursor.fetchone() is None:
            return Respuesta.error("Cliente no encontrado", 404)
            
        cursor.execute("UPDATE clientes SET nombre = %s, correo = %s, edad = %s WHERE id = %s", (nombre, correo, edad, id))
        conn.commit()
        return Respuesta.exito("Cliente actualizado correctamente")
    except psycopg2.IntegrityError:
        conn.rollback()
        return Respuesta.error("El correo ya está en uso por otro cliente.", 409)
    finally:
        conn.close()


# --- ELIMINAR CLIENTE ---
@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def eliminar_cliente(id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clientes WHERE id = %s", (id,))
        if cursor.fetchone() is None:
            return Respuesta.error("Cliente no encontrado", 404)
            
        cursor.execute("DELETE FROM reservas WHERE id_cliente = %s", (id,))
        cursor.execute("DELETE FROM clientes WHERE id = %s", (id,))
        conn.commit()
        return Respuesta.exito("Cliente y sus reservas eliminados correctamente")
    finally:
        conn.close()


# --- CREAR RESERVA ---
@app.route('/api/reservas', methods=['POST'])
def api_crear_reserva():
    datos = request.get_json(silent=True) or {}
    id_cliente = datos.get('id_cliente')
    if not id_cliente:
        return Respuesta.error("Falta el id_cliente.")

    if 'num_pasajeros' not in datos and 'cantidad' in datos:
        datos['num_pasajeros'] = datos['cantidad']
    if 'total_pagado' not in datos and 'total' in datos:
        datos['total_pagado'] = datos['total']

    error, valores = validar_viaje(datos)
    if error:
        return Respuesta.error(error)
    destino, fecha, pasajeros, total = valores

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clientes WHERE id = %s", (id_cliente,))
        if cursor.fetchone() is None:
            return Respuesta.error("El cliente no existe.", 404)
            
        cursor.execute(
            "INSERT INTO reservas (id_cliente, destino, fecha_viaje, num_pasajeros, total_pagado) VALUES (%s, %s, %s, %s, %s)",
            (id_cliente, destino, fecha, pasajeros, total)
        )
        conn.commit()
        return Respuesta.exito(f"Reserva a {destino} guardada", {"total": total})
    finally:
        conn.close()


# --- ACTUALIZAR RESERVA ---
@app.route('/api/reservas/<int:id>', methods=['PUT'])
def actualizar_reserva(id):
    datos = request.get_json(silent=True) or {}
    error, valores = validar_viaje(datos)
    if error:
        return Respuesta.error(error)
    destino, fecha, pasajeros, total = valores

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM reservas WHERE id = %s", (id,))
        if cursor.fetchone() is None:
            return Respuesta.error("Reserva no encontrada", 404)
            
        cursor.execute(
            "UPDATE reservas SET destino = %s, fecha_viaje = %s, num_pasajeros = %s, total_pagado = %s WHERE id = %s",
            (destino, fecha, pasajeros, total, id)
        )
        conn.commit()
        return Respuesta.exito("Reserva actualizada correctamente")
    finally:
        conn.close()


# --- ELIMINAR RESERVA ---
@app.route('/api/reservas/<int:id>', methods=['DELETE'])
def eliminar_reserva(id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM reservas WHERE id = %s", (id,))
        if cursor.fetchone() is None:
            return Respuesta.error("Reserva no encontrada", 404)
            
        cursor.execute("DELETE FROM reservas WHERE id = %s", (id,))
        conn.commit()
        return Respuesta.exito("Reserva eliminada correctamente")
    finally:
        conn.close()


# --- VER TODAS LAS RESERVAS ---
@app.route('/api/reservas', methods=['GET'])
def obtener_reservas():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.id, r.destino, r.fecha_viaje, r.num_pasajeros, r.total_pagado, r.fecha_reserva,
                   c.nombre AS nombre_cliente, c.correo AS correo_cliente
            FROM reservas r
            JOIN clientes c ON r.id_cliente = c.id
            ORDER BY r.id DESC
        ''')
        reservas = cursor.fetchall()
        return Respuesta.exito("Lista de reservas obtenida", [dict(r) for r in reservas])
    finally:
        conn.close()


# --- GUARDAR RESERVA COMPLETA ---
@app.route('/api/guardar_reserva_completa', methods=['POST'])
def guardar_reserva_completa():
    datos = request.get_json(silent=True) or {}

    error, valores_cliente = validar_cliente(datos)
    if error:
        return Respuesta.error(error)
    nombre, correo, edad = valores_cliente

    error, valores_viaje = validar_viaje(
        datos, clave_pasajeros="pasajeros", clave_total="total", clave_fecha="fecha", fecha_obligatoria=True
    )
    if error:
        return Respuesta.error(error)
    destino, fecha, pasajeros, total = valores_viaje

    if fecha < date.today().isoformat():
        return Respuesta.error("La fecha del viaje no puede ser en el pasado.")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clientes WHERE lower(correo) = %s", (correo,))
        cliente = cursor.fetchone()

        if cliente:
            id_cliente = cliente['id']
        else:
            cursor.execute("SELECT COUNT(*) AS total FROM clientes")
            count = cursor.fetchone()['total']
            if count >= MAX_CLIENTES:
                return Respuesta.error("Límite de usuarios alcanzado.", 400)
                
            cursor.execute("INSERT INTO clientes (nombre, correo, edad) VALUES (%s, %s, %s) RETURNING id", (nombre, correo, edad))
            id_cliente = cursor.fetchone()['id']

        cursor.execute(
            "INSERT INTO reservas (id_cliente, destino, fecha_viaje, num_pasajeros, total_pagado) VALUES (%s, %s, %s, %s, %s)",
            (id_cliente, destino, fecha, pasajeros, total)
        )
        conn.commit()

        # --- ACTIVIDAD 4: INTEROPERABILIDAD ---
        try:
            # Le enviamos los datos a nuestro endpoint de "facturación"
            requests.post("https://apt-pullman-tours.onrender.com/api/sistema_facturacion", json={
                "origen": "Sistema de Reservas APT",
                "evento": "nueva_reserva",
                "cliente": nombre,
                "correo": correo,
                "destino": destino,
                "total_pagado": total
            }, timeout=5)
            print("Datos enviados al Sistema de Facturación exitosamente.")
        except Exception as e:
            print(f"Error al comunicarse con el sistema de facturación: {e}")
        # ---------------------------------------

        return Respuesta.exito(f"Reserva a {destino} guardada exitosamente", {"id_cliente": id_cliente})

    except Exception as e:
        conn.rollback()
        return Respuesta.error(f"Error al guardar: {str(e)}", 500)
    finally:
        conn.close()


# --- SISTEMA B: RECEPTOR DE FACTURACIÓN (Actividad 4) ---
@app.route('/api/sistema_facturacion', methods=['POST'])
def sistema_facturacion():
    datos = request.get_json(silent=True) or {}
    print("\n--- SISTEMA DE FACTURACIÓN RECIBIÓ DATOS ---")
    print(f"Cliente: {datos.get('cliente')}")
    print(f"Destino: {datos.get('destino')}")
    print(f"Total: ${datos.get('total_pagado')}")
    print("--------------------------------------------\n")
    
    return jsonify({
        "estatus": "exito",
        "mensaje": "Factura generada correctamente",
        "folio_factura": "FACT-2026-001"
    }), 200


# --- RUTA RAÍZ ---
@app.route('/')
def index():
    return jsonify({
        "mensaje": "API de APT Pullman Tours funcionando correctamente",
        "version": "1.0",
        "endpoints": [
            "/api/clientes",
            "/api/reservas",
            "/api/guardar_reserva_completa",
            "/api/sistema_facturacion"
        ]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)