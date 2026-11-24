# clases.py
class Cliente:
    def __init__(self, id_cliente, nombre, correo, edad):
        self.id_cliente = id_cliente
        self.nombre = nombre
        self.correo = correo
        self.edad = edad
        self.descuento = 0  # Atributo por defecto

    def es_mayor_de_edad(self):
        return self.edad >= 18

    def aplicar_descuento(self, porcentaje):
        self.descuento = porcentaje
        return self.descuento

    def to_dict(self):
        # Convierte el objeto a diccionario para enviarlo en JSON
        return {
            "id": self.id_cliente,
            "nombre": self.nombre,
            "correo": self.correo,
            "edad": self.edad,
            "descuento": self.descuento
        }

class Viaje:
    def __init__(self, destino, precio_base, capacidad_maxima):
        self.destino = destino
        self.precio_base = precio_base
        self.capacidad_maxima = capacidad_maxima
        self.pasajeros_registrados = 0

    def hay_disponibilidad(self):
        return self.pasajeros_registrados < self.capacidad_maxima

    def registrar_pasajeros(self, cantidad):
        if self.hay_disponibilidad():
            self.pasajeros_registrados += cantidad
            return True
        return False