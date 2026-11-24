# componentes.py
import re

class Validador:
    @staticmethod
    def validar_correo(correo):
        # Retorna True si el correo es válido, False si no
        return bool(re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", correo))

    @staticmethod
    def validar_nombre(nombre):
        return bool(re.match(r"^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$", nombre))

class Respuesta:
    @staticmethod
    def exito(mensaje, datos=None):
        return {"estatus": "exito", "mensaje": mensaje, "datos": datos}, 200

    @staticmethod
    def error(mensaje, codigo=400):
        return {"estatus": "error", "mensaje": mensaje}, codigo