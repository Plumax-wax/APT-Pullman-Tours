
/* ============================================================
   BLOQUE 1: CONSTANTES Y CONFIGURACIÓN GLOBAL
   ============================================================ */
const DESTINOS = {
    "Valle de Bravo": { precio: 1500, tema: "tema-natural", titulo: "Valle de Bravo — Escapada natural", img: "valle.png" },
    "Taxco": { precio: 850, tema: "tema-cultural", titulo: "Taxco — Pueblo mágico colonial", img: "taxco.png" },
    "Puebla": { precio: 700, tema: "tema-cultural", titulo: "Puebla — Capital gastronómica", img: "puebla.png" },
    "Acapulco": { precio: 2300, tema: "tema-playa", titulo: "Acapulco — Paraíso playero", img: "acapulco.png" },
    "Sierra Tarahumara": { precio: 16000, tema: "tema-aventura", titulo: "Sierra Tarahumara", img: "tarahumara.png" },
    "Machu Picchu": { precio: 34000, tema: "tema-aventura", titulo: "Machu Picchu", img: "Machupichu.png" }
};
const COORDENADAS = {
    "Valle de Bravo": { lat: 19.195, lon: -100.131 },
    "Taxco": { lat: 18.556, lon: -99.605 },
    "Puebla": { lat: 19.041, lon: -98.206 },
    "Acapulco": { lat: 16.853, lon: -99.823 },
    "Sierra Tarahumara": { lat: 27.183, lon: -107.533 },
    "Machu Picchu": { lat: -13.163, lon: -72.545 }
};
const HABITACIONES = { sencilla: { nombre: "Sencilla", factor: 1.00 }, doble: { nombre: "Doble", factor: 1.15 }, suite: { nombre: "Suite", factor: 1.35 } };
const SERVICIOS = { alimentos: { nombre: "Alimentos", costo: 450 }, hospedaje: { nombre: "Hospedaje", costo: 800 }, tours: { nombre: "Tours", costo: 350 } };

const estado = { sesion: false, correoUsuario: "", totalAnterior: 0, cuponAplicado: false };
const $ = (id) => document.getElementById(id);
const formatoMXN = (n) => "$" + n.toLocaleString("es-MX") + " MXN";
const API_URL = 'https://apt-pullman-tours.onrender.com/api';

const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ============================================================
   BLOQUE 2: UTILERÍAS Y TOAST
   ============================================================ */
function pulsoBoton(btn) { if (!btn) return; btn.classList.remove("btn-pulso"); void btn.offsetWidth; btn.classList.add("btn-pulso"); }
function marcarCampo(el, valido) { if (!el) return; el.classList.toggle("is-valid", valido); el.classList.toggle("is-invalid", !valido); }

function mostrarToast(mensaje, tipo = "info") {
    const toastEl = $("toast");
    const body = $("toastBody");
    if (!toastEl || !body) return;
    body.textContent = mensaje;
    toastEl.className = "toast " + (tipo === "error" ? "text-bg-danger" : tipo === "exito" ? "text-bg-success" : "text-bg-primary");
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 }).show();
}

/* ============================================================
   BLOQUE 3: VALIDACIONES Y FILTROS ESTRICTOS (BLINDADOS)
   ============================================================ */
function esSoloLetras(texto) { return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(texto); }
function nombreValido(texto) { const t = texto.trim(); return t.length >= 2 && esSoloLetras(t); }
// Correo: un solo @, solo letras/números/. _ - y dominio con punto (ej. usuario@gmail.com)
function esCorreoValido(correo) { return /^[A-Za-z0-9._-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(correo) && correo.length <= 100; }
function esPasswordValida(password) { return /^[A-Za-z0-9\-_.]+$/.test(password); }
function dominioPermitido(correo) { const c = correo.toLowerCase().trim(); return esCorreoValido(c) && (c.endsWith("@gmail.com") || c.endsWith("@hotmail.com")); }
function esEdadValida(v) { const n = parseInt(v, 10); return /^\d{1,3}$/.test(String(v)) && n >= 18 && n <= 120; }
function esTelefonoValido(v) { return /^\d{10}$/.test(v); }

// Caracteres permitidos por tipo de campo
const CLASES = {
    letras: 'a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s',
    numeros: '0-9',
    correo: 'a-zA-Z0-9@._\\-',
    pass: 'a-zA-Z0-9._\\-',
    cupon: 'a-zA-Z0-9\\-',
    decimal: '0-9.',
    busqueda: 'a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ@._\\-\\s'
};
// Máximo de caracteres por campo numérico
const MAXIMOS = { telefono: 10, edad: 3, adminEdad: 3, pasajeros: 2, adminPasajeros: 2, tarjetaCVV: 3 };

function tipoCampo(el) {
    const id = el.id;
    if (["nombre", "apellidos", "adminNombre", "tarjetaNombre", "buscadorDestinos"].includes(id) && id !== "buscadorDestinos") return "letras";
    if (el.classList.contains("input-nombre-acompanante")) return "letras";
    if (["telefono", "edad", "adminEdad", "adminPasajeros", "pasajeros", "tarjetaCVV", "tarjetaNumero"].includes(id)) return "numeros";
    if (el.classList.contains("input-edad-acompanante")) return "numeros";
    if (["correo", "adminCorreo", "loginCorreo"].includes(id)) return "correo";
    if (id === "loginPass") return "pass";
    if (id === "inputCupon") return "cupon";
    if (id === "adminTotal") return "decimal";
    if (["buscadorDestinos", "buscadorAdmin"].includes(id)) return "busqueda";
    return null;
}

// Validadores en vivo (marcan verde/rojo mientras se escribe)
const VALIDADORES = {
    nombre: nombreValido, apellidos: nombreValido, adminNombre: nombreValido,
    correo: esCorreoValido, adminCorreo: esCorreoValido, loginCorreo: esCorreoValido,
    telefono: esTelefonoValido, edad: esEdadValida, adminEdad: esEdadValida
};

// Bloquea la tecla si no pertenece al tipo de campo
document.addEventListener("keypress", (e) => {
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return; // Enter, flechas, atajos
    const tipo = tipoCampo(e.target);
    if (!tipo) return;
    if (!new RegExp('[' + CLASES[tipo] + ']').test(e.key)) { e.preventDefault(); return; }
    if (tipo === "correo" && e.key === "@" && e.target.value.includes("@")) e.preventDefault(); // solo un @
    if (tipo === "decimal" && e.key === "." && e.target.value.includes(".")) e.preventDefault();
});

// Limpia lo que se pegue o autocomplete
document.addEventListener("input", (e) => {
    const t = e.target;
    const tipo = tipoCampo(t);
    if (!tipo) return;

    let val = t.value.replace(new RegExp('[^' + CLASES[tipo] + ']', 'g'), '');
    if (tipo === "correo") { const p = val.split('@'); if (p.length > 2) val = p[0] + '@' + p.slice(1).join(''); val = val.slice(0, 100); }
    if (tipo === "decimal") { const p = val.split('.'); if (p.length > 2) val = p[0] + '.' + p.slice(1).join(''); }
    if (MAXIMOS[t.id]) val = val.slice(0, MAXIMOS[t.id]);
    if (t.classList.contains("input-edad-acompanante")) val = val.slice(0, 3);
    if (val !== t.value) t.value = val;

    if (VALIDADORES[t.id]) {
        if (val === "") t.classList.remove("is-valid", "is-invalid");
        else marcarCampo(t, VALIDADORES[t.id](val.trim()));
    }
});

/* ============================================================
   BLOQUE 4: LOGIN Y SESIÓN
   ============================================================ */
function actualizarInterfazSesion() {
    if (estado.sesion) {
        $("navSesion").classList.add("d-none"); $("navUsuario").classList.remove("d-none"); $("navUsuario").classList.add("d-flex"); $("lblUsuario").textContent = estado.correoUsuario;
    } else {
        $("navSesion").classList.remove("d-none"); $("navUsuario").classList.add("d-none"); $("navUsuario").classList.remove("d-flex");
    }
}

function validarLogin(evento) {
    evento.preventDefault();
    const correo = $("loginCorreo").value.trim(); const pass = $("loginPass").value.trim(); const aviso = $("avisoLogin");
    const error = (m) => { aviso.textContent = m; aviso.className = "alert alert-danger"; aviso.classList.remove("d-none"); };
    if (!correo || !pass) return error("Completa todos los campos.");
    if (!dominioPermitido(correo)) return error("Solo correos @gmail.com y @hotmail.com.");
    if (!esPasswordValida(pass) || pass.length < 6) return error("Contraseña de 6+ caracteres (letras, números, - _ .).");
    estado.sesion = true; estado.correoUsuario = correo; try { localStorage.setItem("apt_sesion", correo); } catch (e) {}
    aviso.classList.add("d-none");
    actualizarInterfazSesion(); bootstrap.Modal.getInstance($("modalLogin")).hide(); mostrarToast("Bienvenido a APT", "exito"); programarResumen();
}

function cerrarSesion() { estado.sesion = false; estado.correoUsuario = ""; try { localStorage.removeItem("apt_sesion"); } catch (e) {} actualizarInterfazSesion(); mostrarToast("Sesión cerrada", "info"); programarResumen(); }
function restaurarSesion() { try { const g = localStorage.getItem("apt_sesion"); if (g) { estado.sesion = true; estado.correoUsuario = g; actualizarInterfazSesion(); } } catch (e) {} }

/* ============================================================
   BLOQUE 5: PERSISTENCIA DEL CARRITO
   ============================================================ */
function guardarCarrito() {
    try {
        const datos = {
            nombre: $("nombre").value, apellidos: $("apellidos").value, correo: $("correo").value, telefono: $("telefono").value, edad: $("edad").value,
            destino: $("destino").value, fecha: $("fecha").value, pasajeros: $("pasajeros").value,
            hab: document.querySelector('input[name="hab"]:checked')?.value || "",
            alimentos: $("alimentos").checked, hospedaje: $("hospedaje").checked, tours: $("tours").checked,
            descuento: estado.cuponAplicado,
            acompanantes: Array.from(document.querySelectorAll(".fila-acompanante")).map(f => ({ nombre: f.querySelector(".input-nombre-acompanante").value, edad: f.querySelector(".input-edad-acompanante").value }))
        };
        localStorage.setItem("apt_carrito", JSON.stringify(datos));
    } catch (e) {}
}

function cargarCarrito() {
    try {
        const guardado = localStorage.getItem("apt_carrito"); if (!guardado) return; const datos = JSON.parse(guardado);
        $("nombre").value = datos.nombre || ""; $("apellidos").value = datos.apellidos || ""; $("correo").value = datos.correo || ""; $("telefono").value = datos.telefono || ""; $("edad").value = datos.edad || "";
        $("destino").value = DESTINOS[datos.destino] ? datos.destino : ""; $("fecha").value = datos.fecha || ""; $("pasajeros").value = datos.pasajeros || 1;
        if (datos.hab) { const r = document.querySelector(`input[name="hab"][value="${datos.hab}"]`); if (r) r.checked = true; }
        $("alimentos").checked = !!datos.alimentos; $("hospedaje").checked = !!datos.hospedaje; $("tours").checked = !!datos.tours;
        estado.cuponAplicado = datos.descuento || false; $("switchDescuento").checked = estado.cuponAplicado;
        if (datos.acompanantes) datos.acompanantes.forEach(ac => agregarAcompanante(ac.nombre, ac.edad));
        programarResumen();
    } catch (e) {}
}

/* ============================================================
   BLOQUE 6: TARJETAS Y SELECCIÓN
   ============================================================ */
function crearTarjetas() {
    const contenedor = $("contenedorTarjetas"); if (!contenedor) return;
    let html = "";
    Object.entries(DESTINOS).forEach(([nombre, data]) => {
        if (nombre === "Sierra Tarahumara" || nombre === "Machu Picchu") return;
        html += `<div class="col-12 col-sm-6 col-lg-3"><div class="card tarjeta-viaje-premium h-100" data-destino="${nombre}" tabindex="0" role="button"><img src="${data.img}" class="card-img-top" alt="${nombre}" style="height: 150px; object-fit: cover;"><div class="card-body"><h5 class="card-title h6 fw-bold mb-1">${nombre}</h5><p class="card-text small text-muted mb-2">${data.titulo}</p><p class="precio mb-0 text-success fw-bold">Desde ${formatoMXN(data.precio)}</p></div></div></div>`;
    });
    contenedor.innerHTML = html;
    document.querySelectorAll(".tarjeta-viaje-premium").forEach(card => { card.addEventListener("click", (e) => { e.preventDefault(); seleccionarDestino(card.dataset.destino); }); });
}

function seleccionarDestino(destino) {
    $("destino").value = destino; programarResumen(); guardarCarrito();
    document.querySelectorAll(".tarjeta-viaje-premium").forEach(c => c.classList.remove("seleccionada"));
    const target = document.querySelector(`.tarjeta-viaje-premium[data-destino="${destino}"]`); if (target) target.classList.add("seleccionada");
    if (estado.sesion) { $("titulo-cotizador").scrollIntoView({ behavior: "smooth", block: "center" }); mostrarToast("Destino cargado: " + destino, "exito"); }
    else { bootstrap.Modal.getOrCreateInstance($("modalLogin")).show(); mostrarToast("Inicia sesión para continuar", "info"); }
}

/* ============================================================
   BLOQUE 7: RESUMEN DE COMPRA (ACTUALIZACIÓN EN TIEMPO REAL)
   ============================================================ */
function programarResumen() { requestAnimationFrame(() => { actualizarResumen(); guardarCarrito(); }); }

window.toggleDescuento = function (idSwitch) {
    estado.cuponAplicado = $(idSwitch).checked;
    programarResumen();
};

function calcularTotales(destino, pasajeros, habInput) {
    const basePrecio = DESTINOS[destino].precio * pasajeros;
    const factorHab = habInput ? HABITACIONES[habInput.value].factor : 1;
    const extras = Object.keys(SERVICIOS).reduce((t, id) => t + (document.getElementById(id)?.checked ? SERVICIOS[id].costo : 0), 0);
    const subtotal = (basePrecio * factorHab) + extras;
    const descuento = estado.cuponAplicado ? subtotal * 0.10 : 0;
    return { extras, descuento, total: subtotal - descuento };
}

function actualizarResumen() {
    const resumenDiv = $("resumenCompra"); if (!resumenDiv) return;
    const nombre = $("nombre").value.trim(); const apellidos = $("apellidos").value.trim(); const correo = $("correo").value.trim();
    const telefono = $("telefono").value.trim(); const edad = $("edad").value.trim(); const destino = $("destino").value;
    const fecha = $("fecha").value; const pasajeros = Math.min(50, Math.max(1, parseInt($("pasajeros").value, 10) || 1)); const habInput = document.querySelector('input[name="hab"]:checked');

    if (!destino || !DESTINOS[destino]) { resumenDiv.innerHTML = `<p class="text-muted text-center">Aún no has seleccionado ningún viaje.</p>`; estado.totalAnterior = 0; return; }

    const nombreHab = habInput ? HABITACIONES[habInput.value].nombre : "No seleccionada";
    const { extras, descuento, total } = calcularTotales(destino, pasajeros, habInput);
    const fechaTexto = fecha ? fecha.split("-").reverse().join("/") : "No seleccionada";

    const acompanantes = [];
    document.querySelectorAll(".fila-acompanante").forEach(fila => { const nom = fila.querySelector(".input-nombre-acompanante").value.trim(); const ed = fila.querySelector(".input-edad-acompanante").value.trim(); if (nom && ed) acompanantes.push({ nombre: nom, edad: ed }); });

    let html = `<h4 class="resumen-titulo">Tu selección</h4>`;
    if (nombre || apellidos) html += `<div class="resumen-item"><strong>Nombre:</strong> <span>${escapeHTML(nombre)} ${escapeHTML(apellidos)}</span></div>`;
    if (correo) html += `<div class="resumen-item"><strong>Correo:</strong> <span>${escapeHTML(correo)}</span></div>`;
    if (telefono) html += `<div class="resumen-item"><strong>Teléfono:</strong> <span>${escapeHTML(telefono)}</span></div>`;
    if (edad) html += `<div class="resumen-item"><strong>Edad:</strong> <span>${escapeHTML(edad)} años</span></div>`;

    html += `<div class="resumen-item"><strong>Destino:</strong> <span>${escapeHTML(destino)}</span></div>`;
    html += `<div class="resumen-item"><strong>Fecha:</strong> <span>${escapeHTML(fechaTexto)}</span></div>`;
    html += `<div class="resumen-item"><strong>Pasajeros:</strong> <span>${pasajeros}</span></div>`;
    html += `<div class="resumen-item"><strong>Habitación:</strong> <span>${nombreHab}</span></div>`;
    if (acompanantes.length > 0) { html += `<div class="mt-3"><strong>Acompañantes:</strong><ul class="lista-acompanantes-resumen ps-3">`; acompanantes.forEach(ac => { html += `<li>${escapeHTML(ac.nombre)} (${escapeHTML(ac.edad)} años)</li>`; }); html += `</ul></div>`; }
    html += `<div class="resumen-item mt-2"><strong>Extras:</strong> <span>${extras > 0 ? formatoMXN(extras) : "Ninguno"}</span></div>`;
    if (estado.cuponAplicado) html += `<div class="resumen-item text-success"><strong>Descuento (10%):</strong> <span>-${formatoMXN(descuento)}</span></div>`;
    html += `<div class="resumen-total" id="bloqueTotal"><span>Total:</span> <span id="numTotal">${formatoMXN(total)}</span></div>`;
    resumenDiv.innerHTML = html;

    // --- AQUI ESTA LA MAGIA DE LA ACTIVIDAD 3 ---
    mostrarClima(destino, resumenDiv);

    if (estado.totalAnterior !== total && estado.totalAnterior !== 0) { animarConteo(estado.totalAnterior, total); $("bloqueTotal").classList.add("destello"); setTimeout(() => $("bloqueTotal")?.classList.remove("destello"), 400); }
    estado.totalAnterior = total;
}

async function mostrarClima(destino, contenedorResumen) {
    if (!COORDENADAS[destino]) return;
    const { lat, lon } = COORDENADAS[destino];
    
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        const clima = data.current_weather;
        
        const climaDiv = document.createElement("div");
        climaDiv.className = "alert alert-info mt-3 py-2 text-center small";
        climaDiv.innerHTML = `<strong>☀️ Clima actual en ${destino}:</strong> ${clima.temperature}°C, Viento: ${clima.windspeed} km/h`;
        
        const bloqueTotal = contenedorResumen.querySelector('.resumen-total');
        if (bloqueTotal) contenedorResumen.insertBefore(climaDiv, bloqueTotal);
        
    } catch (e) {
        console.error("Error al obtener el clima", e);
    }
}

function animarConteo(inicio, fin) { const el = $("numTotal"); if (!el) return; const duracion = 400; let inicioTimestamp = null; function paso(timestamp) { if (!inicioTimestamp) inicioTimestamp = timestamp; const progreso = Math.min((timestamp - inicioTimestamp) / duracion, 1); const actual = Math.floor(progreso * (fin - inicio) + inicio); el.textContent = formatoMXN(actual); if (progreso < 1) window.requestAnimationFrame(paso); } window.requestAnimationFrame(paso); }
/* ============================================================
   BLOQUE 8: ACOMPAÑANTES
   ============================================================ */
function actualizarContadorAcompanantes() {
    const maxPasajeros = parseInt($("pasajeros").value, 10) || 1; const maxAcompanantes = maxPasajeros - 1; const actuales = document.querySelectorAll(".fila-acompanante").length;
    const badge = $("contadorAcompanantes"); if (badge) { badge.textContent = `${actuales} de ${maxAcompanantes}`; badge.className = actuales >= maxAcompanantes ? "badge bg-danger fs-6" : "badge bg-primary fs-6"; }
    const btnAgregar = $("btnAgregarAcompanante"); if (btnAgregar) { btnAgregar.disabled = actuales >= maxAcompanantes; }
}

function agregarAcompanante(nombrePre = "", edadPre = "") {
    const contenedor = $("contenedorAcompanantes"); if (!contenedor) return;
    const maxPasajeros = parseInt($("pasajeros").value, 10) || 1; const actuales = document.querySelectorAll(".fila-acompanante").length;
    if (nombrePre === "" && actuales >= (maxPasajeros - 1)) { mostrarToast(`Solo puedes agregar ${maxPasajeros - 1} acompañante(s).`, "error"); return; }

    const fila = document.createElement("div"); fila.className = "fila-acompanante";
    const inputNombre = document.createElement("input"); inputNombre.type = "text"; inputNombre.className = "form-control input-nombre-acompanante"; inputNombre.placeholder = "Nombre"; inputNombre.maxLength = 50; inputNombre.required = true; inputNombre.value = nombrePre;
    inputNombre.addEventListener("input", programarResumen);
    const inputEdad = document.createElement("input"); inputEdad.type = "text"; inputEdad.inputMode = "numeric"; inputEdad.className = "form-control input-edad-acompanante"; inputEdad.placeholder = "Edad"; inputEdad.maxLength = 3; inputEdad.required = true; inputEdad.value = edadPre;
    inputEdad.addEventListener("input", programarResumen);
    const btnEliminar = document.createElement("button"); btnEliminar.type = "button"; btnEliminar.className = "btn-eliminar"; btnEliminar.textContent = "Eliminar";
    btnEliminar.onclick = () => { fila.classList.add("saliendo"); setTimeout(() => { fila.remove(); programarResumen(); actualizarContadorAcompanantes(); }, 250); };
    fila.append(inputNombre, inputEdad, btnEliminar); contenedor.appendChild(fila); actualizarContadorAcompanantes(); programarResumen();
}

/* ============================================================
   BLOQUE 9: COTIZAR Y GUARDAR EN BD
   ============================================================ */
function calcularCotizacion() {
    if (!estado.sesion) { bootstrap.Modal.getOrCreateInstance($("modalLogin")).show(); return; }
    const btn = $("btnCotizar"); const spinner = $("spinnerCotizar"); const txt = $("txtCotizar");
    const nombre = $("nombre").value.trim(); const apellidos = $("apellidos").value.trim(); const correo = $("correo").value.trim();
    const telefono = $("telefono").value.trim(); const edadTxt = $("edad").value.trim(); const edad = parseInt(edadTxt, 10); const destino = $("destino").value; const fecha = $("fecha").value;
    const pasajeros = parseInt($("pasajeros").value, 10);

    const campo = (id, ok, msg) => { if (!ok) { mostrarToast(msg, "error"); $(id).classList.add("is-invalid"); $(id).focus(); return false; } $(id).classList.remove("is-invalid"); return true; };
    if (!campo("nombre", nombreValido(nombre), "Nombre inválido (solo letras, mínimo 2).")) return;
    if (!campo("apellidos", nombreValido(apellidos), "Apellidos inválidos (solo letras, mínimo 2).")) return;
    if (!campo("correo", esCorreoValido(correo), "Correo inválido (ej. usuario@gmail.com).")) return;
    if (!campo("telefono", esTelefonoValido(telefono), "El teléfono debe tener 10 dígitos numéricos.")) return;
    if (!campo("edad", esEdadValida(edadTxt), "Edad entre 18 y 120 años.")) return;
    if (!destino || !DESTINOS[destino]) { mostrarToast("Selecciona un destino.", "error"); return; }
    if (!fecha) { mostrarToast("Selecciona una fecha.", "error"); return; }
    if (!campo("pasajeros", pasajeros >= 1 && pasajeros <= 50, "Pasajeros entre 1 y 50.")) return;

    // Acompañantes completos y válidos
    const filas = document.querySelectorAll(".fila-acompanante");
    for (const fila of filas) {
        const n = fila.querySelector(".input-nombre-acompanante").value.trim(); const e = parseInt(fila.querySelector(".input-edad-acompanante").value, 10);
        if (!nombreValido(n) || isNaN(e) || e < 1 || e > 120) { mostrarToast("Revisa los acompañantes: nombre (solo letras) y edad (1-120).", "error"); return; }
    }

    btn.disabled = true; if (spinner) spinner.classList.remove("d-none"); if (txt) txt.textContent = "Guardando...";

    const habInput = document.querySelector('input[name="hab"]:checked'); const habitacion = habInput ? HABITACIONES[habInput.value].nombre : "Sencilla";
    const { extras, descuento, total } = calcularTotales(destino, pasajeros, habInput);

    fetch(`${API_URL}/guardar_reserva_completa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: `${nombre} ${apellidos}`, correo, edad, destino, fecha, pasajeros, total, habitacion })
    })
    .then(res => res.json())
    .then(data => {
        btn.disabled = false; if (spinner) spinner.classList.add("d-none"); if (txt) txt.textContent = "Cotizar viaje ahora";
        if (data.estatus === "exito") {
            mostrarToast("¡Reserva guardada exitosamente!", "exito");
            const resumenDiv = $("resumenCompra"); const textoExtras = extras > 0 ? formatoMXN(extras) : "Ninguno";
            const listaAcompanantes = []; filas.forEach(fila => { const n = fila.querySelector(".input-nombre-acompanante").value.trim(); const e = fila.querySelector(".input-edad-acompanante").value.trim(); if (n && e) listaAcompanantes.push(`${escapeHTML(n)} (${escapeHTML(e)} años)`); });
            const htmlAcompanantes = listaAcompanantes.length > 0 ? `<div class="resumen-item mt-3"><strong>Acompañantes:</strong><ul class="ps-3 mb-0">${listaAcompanantes.map(a => `<li>${a}</li>`).join('')}</ul></div>` : "";

            resumenDiv.innerHTML = `
                <div class="alert alert-success text-center mb-3"><h5 class="fw-bold">✅ Reserva Confirmada y Guardada</h5><p class="mb-0 small">Esta información ya se encuentra en la base de datos.</p></div>
                <h4 class="resumen-titulo">Detalles de tu Reserva</h4>
                <div class="resumen-item"><strong>Cliente:</strong> <span>${escapeHTML(nombre)} ${escapeHTML(apellidos)}</span></div>
                <div class="resumen-item"><strong>Correo:</strong> <span>${escapeHTML(correo)}</span></div>
                <div class="resumen-item"><strong>Teléfono:</strong> <span>${escapeHTML(telefono)}</span></div>
                <div class="resumen-item"><strong>Edad:</strong> <span>${edad} años</span></div>
                <div class="resumen-item"><strong>Destino:</strong> <span>${escapeHTML(destino)}</span></div>
                <div class="resumen-item"><strong>Fecha del viaje:</strong> <span>${escapeHTML(fecha.split("-").reverse().join("/"))}</span></div>
                <div class="resumen-item"><strong>Pasajeros:</strong> <span>${pasajeros}</span></div>
                <div class="resumen-item"><strong>Habitación:</strong> <span>${habitacion}</span></div>
                <div class="resumen-item"><strong>Extras:</strong> <span>${textoExtras}</span></div>
                ${htmlAcompanantes}
                ${estado.cuponAplicado ? `<div class="resumen-item text-success"><strong>Descuento (10%):</strong> <span>-${formatoMXN(descuento)}</span></div>` : ''}
                <div class="resumen-total"><span>Total a Pagar:</span> <span>${formatoMXN(total)}</span></div>
            `;
            if ($("adminTablaClientes")) { cargarClientesAdmin(); cargarReservasAdmin(); }
            resumenDiv.scrollIntoView({ behavior: "smooth", block: "center" });
        } else { mostrarToast(`Error: ${data.mensaje}`, "error"); }
    })
    .catch(() => { btn.disabled = false; if (spinner) spinner.classList.add("d-none"); if (txt) txt.textContent = "Cotizar viaje ahora"; mostrarToast("Error de conexión con el servidor.", "error"); });
}

/* ============================================================
   BLOQUE 10: BUSCADOR, CUPÓN Y PAGOS
   ============================================================ */
function configurarBuscadorXSS() {
    const buscador = $("buscadorDestinos"); const contenedorTarjetas = $("contenedorTarjetas"); const resultadoBusqueda = $("resultadoBusqueda"); if (!buscador || !contenedorTarjetas) return;
    buscador.addEventListener("input", function () {
        const texto = this.value.trim().toLowerCase(); resultadoBusqueda.textContent = texto.length > 0 ? "Buscando: " + this.value : ""; resultadoBusqueda.className = texto.length > 0 ? "mt-2 text-center small text-primary fw-bold" : "mt-2 text-center small text-muted";
        const tarjetas = document.querySelectorAll(".tarjeta-viaje-premium"); let encontrados = 0;
        tarjetas.forEach(tarjeta => { const nombre = tarjeta.dataset.destino.toLowerCase(); if (nombre.includes(texto)) { tarjeta.parentElement.style.display = "block"; encontrados++; } else { tarjeta.parentElement.style.display = "none"; } });
        if (encontrados === 0 && texto !== "") { resultadoBusqueda.textContent = `No se encontraron viajes.`; resultadoBusqueda.className = "mt-2 text-center small text-danger"; }
    });
}

function configurarPagos() {
    const radios = document.querySelectorAll('input[name="metodoPago"]'); const formTarjeta = $("formularioTarjeta"); const msjEfectivo = $("mensajeEfectivo");
    radios.forEach(radio => { radio.addEventListener("change", function () { if (this.value === "tarjeta") { formTarjeta.classList.remove("d-none"); msjEfectivo.classList.add("d-none"); } else { formTarjeta.classList.add("d-none"); msjEfectivo.classList.remove("d-none"); } }); });
    $("tarjetaNumero")?.addEventListener("input", function () { let val = this.value.replace(/\D/g, "").slice(0, 16); val = val.replace(/(.{4})/g, "$1 ").trim(); this.value = val; });
    $("tarjetaExp")?.addEventListener("input", function () { this.value = this.value.replace(/[^0-9\/]/g, ''); if (this.value.length === 2 && !this.value.includes('/')) this.value += '/'; });
    $("btnPagarTarjeta").addEventListener("click", () => {
        const nom = $("tarjetaNombre").value.trim(); const num = $("tarjetaNumero").value.replace(/\s/g, ""); const exp = $("tarjetaExp").value; const cvv = $("tarjetaCVV").value;
        if (!nombreValido(nom)) { mostrarToast("Nombre del titular inválido (solo letras).", "error"); return; }
        if (num.length !== 16) { mostrarToast("La tarjeta debe tener 16 dígitos.", "error"); return; }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) { mostrarToast("Expiración inválida (MM/AA).", "error"); return; }
        if (!/^\d{3}$/.test(cvv)) { mostrarToast("El CVV debe tener 3 dígitos.", "error"); return; }
        mostrarToast("Procesando pago... ¡Pago exitoso!", "exito");
        setTimeout(() => { $("formTarjeta").reset(); formTarjeta.classList.add("d-none"); document.querySelectorAll('input[name="metodoPago"]').forEach(r => r.checked = false); mostrarToast("¡Gracias por tu compra!", "exito"); }, 1500);
    });
}

function configurarFecha() {
    const inputFecha = $("fecha"); if (!inputFecha) return; const hoy = new Date(); const fechaMinima = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    inputFecha.setAttribute("min", fechaMinima);
    inputFecha.addEventListener("change", function () { if (this.value && this.value < fechaMinima) { this.classList.add("is-invalid"); mostrarToast("La fecha no puede ser en el pasado.", "error"); this.value = ""; } else { this.classList.remove("is-invalid"); } programarResumen(); });
}

/* ============================================================
   BLOQUE 11: ADMINISTRACIÓN (CRUD + BUSCADOR)
   ============================================================ */
const normalizar = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Filtra en vivo las dos tablas del panel por cualquier columna (id, nombre, correo, destino, fecha...)
function filtrarAdmin() {
    const input = $("buscadorAdmin"); if (!input) return;
    const q = normalizar(input.value);
    let totalVisibles = 0, totalFilas = 0;
    ["adminTablaClientes", "adminTablaReservas"].forEach(id => {
        const tb = $(id); if (!tb) return;
        tb.querySelectorAll(".fila-sin-resultados").forEach(f => f.remove());
        const filas = [...tb.querySelectorAll("tr")].filter(tr => !tr.querySelector("td[colspan]"));
        let visibles = 0;
        filas.forEach(tr => { const ok = !q || normalizar(tr.textContent).includes(q); tr.style.display = ok ? "" : "none"; if (ok) visibles++; });
        totalVisibles += visibles; totalFilas += filas.length;
        if (q && filas.length > 0 && visibles === 0) tb.insertAdjacentHTML("beforeend", `<tr class="fila-sin-resultados"><td colspan="7" class="text-center text-muted">Sin coincidencias.</td></tr>`);
    });
    const info = $("resultadoBusquedaAdmin");
    if (info) info.textContent = q ? `${totalVisibles} de ${totalFilas} registros coinciden con "${input.value.trim()}"` : "";
}

function cargarClientesAdmin() {
    const tbody = $("adminTablaClientes"); if (!tbody) return; tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Cargando...</td></tr>';
    fetch(`${API_URL}/clientes`).then(res => res.json()).then(data => {
        if (data.estatus !== "exito") { tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error: ${escapeHTML(data.mensaje)}</td></tr>`; return; }
        if (data.datos.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay clientes registrados.</td></tr>'; return; }
        const clientesUnicos = {};
        data.datos.forEach(row => {
            if (!clientesUnicos[row.id]) clientesUnicos[row.id] = { id: row.id, nombre: row.nombre, correo: row.correo, edad: row.edad, viajes: [] };
            if (row.destino) clientesUnicos[row.id].viajes.push({ id_reserva: row.id_reserva, destino: row.destino, fecha: row.fecha_viaje, pax: row.num_pasajeros, total: row.total_pagado });
        });
        let html = "";
        Object.values(clientesUnicos).forEach(c => {
            let textoViajes = '<span class="text-muted">Sin viajes</span>';
            if (c.viajes.length > 0) textoViajes = c.viajes.map(v => `${escapeHTML(v.destino)} (${v.pax} pax)`).join('<br>');
            const primerViaje = c.viajes[0] || { id_reserva: 0, destino: "", fecha: "", pax: 1, total: 0 };
            const datosEdicion = encodeURIComponent(JSON.stringify({ cliente: c, viaje: primerViaje }));
            html += `
                <tr>
                    <td><span class="badge bg-secondary">${c.id}</span></td>
                    <td>${escapeHTML(c.nombre)}</td>
                    <td>${escapeHTML(c.correo)}</td>
                    <td>${escapeHTML(c.edad)}</td>
                    <td class="small">${textoViajes}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-warning me-1" onclick="prepararEdicionCompleta('${datosEdicion}')">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarCliente(${c.id})">🗑️</button>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = html;
        filtrarAdmin();
    }).catch(() => { tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error de conexión.</td></tr>`; });
}

function cargarReservasAdmin() {
    const tbody = $("adminTablaReservas"); if (!tbody) return; tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Cargando...</td></tr>';
    fetch(`${API_URL}/reservas`).then(res => res.json()).then(data => {
        if (data.estatus !== "exito") { tbody.innerHTML = `<tr><td colspan="7" class="text-danger">Error: ${escapeHTML(data.mensaje)}</td></tr>`; return; }
        if (data.datos.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay reservas registradas.</td></tr>'; return; }
        tbody.innerHTML = data.datos.map(r => `<tr>
            <td><span class="badge bg-secondary">${r.id}</span></td>
            <td>${escapeHTML(r.nombre_cliente)}</td>
            <td>${escapeHTML(r.destino)}</td>
            <td>${escapeHTML(r.fecha_viaje || 'No definida')}</td>
            <td>${r.num_pasajeros}</td>
            <td>$${Number(r.total_pagado).toLocaleString("es-MX")}</td>
            <td class="text-center"><button class="btn btn-sm btn-danger" onclick="eliminarReserva(${r.id})">🗑️</button></td>
        </tr>`).join('');
        filtrarAdmin();
    }).catch(() => { tbody.innerHTML = `<tr><td colspan="7" class="text-danger">Error de conexión.</td></tr>`; });
}

// Calcular total en el panel de Admin automáticamente (el admin puede ajustarlo a mano después)
window.calcularTotalAdmin = function () {
    const destino = $("adminDestino").value;
    const pasajeros = Math.min(50, Math.max(1, parseInt($("adminPasajeros").value, 10) || 1));
    const conDescuento = $("adminSwitchDescuento").checked;
    if (!destino || !DESTINOS[destino]) { $("adminTotal").value = 0; return; }
    const precioBase = DESTINOS[destino].precio * pasajeros;
    $("adminTotal").value = conDescuento ? precioBase * 0.90 : precioBase;
};

const formAdmin = $("formCliente");
if (formAdmin) {
    formAdmin.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = $("adminId").value; const reservaId = $("adminReservaId").value;
        const nombre = $("adminNombre").value.trim(); const correo = $("adminCorreo").value.trim(); const edad = $("adminEdad").value.trim();
        const destino = $("adminDestino").value; const fecha = $("adminFecha").value; const pasajeros = parseInt($("adminPasajeros").value, 10); const total = parseFloat($("adminTotal").value);

        if (!nombre || !correo || !edad) { mostrarToast("Los campos del cliente son obligatorios", "error"); return; }
        if (!nombreValido(nombre)) { mostrarToast("El nombre solo debe tener letras (mínimo 2).", "error"); return; }
        if (!esCorreoValido(correo)) { mostrarToast("Correo inválido (ej. usuario@gmail.com).", "error"); return; }
        if (!esEdadValida(edad)) { mostrarToast("Edad entre 18 y 120.", "error"); return; }
        if (destino) {
            if (!DESTINOS[destino]) { mostrarToast("Destino inválido.", "error"); return; }
            if (!fecha) { mostrarToast("Selecciona la fecha del viaje.", "error"); return; }
            if (isNaN(pasajeros) || pasajeros < 1 || pasajeros > 50) { mostrarToast("Pasajeros entre 1 y 50.", "error"); return; }
            if (isNaN(total) || total < 0) { mostrarToast("El total debe ser un número válido (0 o más).", "error"); return; }
        }

        const method = id ? 'PUT' : 'POST'; const url = id ? `${API_URL}/clientes/${id}` : `${API_URL}/clientes`;

        fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, correo, edad: parseInt(edad, 10) }) })
        .then(res => res.json())
        .then(dataCliente => {
            if (dataCliente.estatus !== "exito") throw new Error(dataCliente.mensaje);
            if (destino) {
                const esUpdate = id && reservaId && reservaId !== "0";
                const viajeUrl = esUpdate ? `${API_URL}/reservas/${reservaId}` : `${API_URL}/reservas`;
                const viajeData = { id_cliente: id || dataCliente.datos.id, destino, fecha_viaje: fecha, num_pasajeros: pasajeros, total_pagado: total };
                return fetch(viajeUrl, { method: esUpdate ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(viajeData) }).then(res => res.json());
            }
            return { estatus: "exito" };
        })
        .then(dataViaje => {
            if (dataViaje.estatus === "exito") { mostrarToast("Cliente y Viaje guardados correctamente", "exito"); cancelarEdicion(); cargarClientesAdmin(); cargarReservasAdmin(); }
            else { mostrarToast(`Error en viaje: ${dataViaje.mensaje}`, "error"); }
        })
        .catch(err => { mostrarToast(`Error: ${err.message}`, "error"); });
    });
}

window.prepararEdicionCompleta = function (datosString) {
    const datos = JSON.parse(decodeURIComponent(datosString)); const c = datos.cliente; const v = datos.viaje;
    $("adminId").value = c.id; $("adminNombre").value = c.nombre; $("adminCorreo").value = c.correo; $("adminEdad").value = c.edad;
    $("adminReservaId").value = v.id_reserva || "0"; $("adminDestino").value = v.destino || ""; $("adminFecha").value = v.fecha || ""; $("adminPasajeros").value = v.pax || 1; $("adminTotal").value = v.total || 0;
    $("adminSwitchDescuento").checked = false;
    document.querySelectorAll("#formCliente .is-valid, #formCliente .is-invalid").forEach(el => el.classList.remove("is-valid", "is-invalid"));
    $("adminFormTitle").textContent = `Editando Cliente ID: ${c.id}`; $("btnAdminGuardar").textContent = "Actualizar Cliente y Viaje"; $("btnAdminGuardar").className = "btn btn-warning w-100"; $("btnAdminCancelar").classList.remove("d-none");
    $("formCliente").scrollIntoView({ behavior: "smooth", block: "center" });
};

window.cancelarEdicion = function () {
    $("formCliente").reset(); $("adminId").value = ""; $("adminReservaId").value = ""; $("adminSwitchDescuento").checked = false; $("adminTotal").value = 0;
    document.querySelectorAll("#formCliente .is-valid, #formCliente .is-invalid").forEach(el => el.classList.remove("is-valid", "is-invalid"));
    $("adminFormTitle").textContent = "Registrar Nuevo Cliente"; $("btnAdminGuardar").textContent = "Guardar Cliente"; $("btnAdminGuardar").className = "btn btn-success w-100"; $("btnAdminCancelar").classList.add("d-none");
};

window.eliminarCliente = function (id) {
    if (!confirm(`¿Estás seguro de eliminar al cliente con ID ${id} y todas sus reservas?`)) return;
    fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' }).then(res => res.json()).then(data => {
        if (data.estatus === "exito") { mostrarToast(data.mensaje, "exito"); cargarClientesAdmin(); cargarReservasAdmin(); } else { mostrarToast(`Error: ${data.mensaje}`, "error"); }
    }).catch(() => { mostrarToast("Error al intentar eliminar.", "error"); });
};

window.eliminarReserva = function (id) {
    if (!confirm(`¿Eliminar la reserva con ID ${id}?`)) return;
    fetch(`${API_URL}/reservas/${id}`, { method: 'DELETE' }).then(res => res.json()).then(data => {
        if (data.estatus === "exito") { mostrarToast(data.mensaje, "exito"); cargarClientesAdmin(); cargarReservasAdmin(); } else { mostrarToast(`Error: ${data.mensaje}`, "error"); }
    }).catch(() => { mostrarToast("Error al intentar eliminar la reserva.", "error"); });
};

/* ============================================================
   BLOQUE 12: INICIALIZACIÓN GENERAL
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    restaurarSesion(); cargarCarrito(); configurarFecha(); crearTarjetas(); configurarBuscadorXSS(); configurarPagos();
    const io = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }); }, { threshold: 0.1 });
    document.querySelectorAll(".bloque").forEach(el => { el.classList.add("reveal"); io.observe(el); });

    $("formLogin").addEventListener("submit", validarLogin); $("btnNavCerrarSesion").addEventListener("click", cerrarSesion);
    $("btnCotizar").addEventListener("click", calcularCotizacion); $("btnLimpiar").addEventListener("click", limpiarFormulario); $("btnImprimir").addEventListener("click", imprimirResumen);
    $("formCotizacion").addEventListener("input", programarResumen); $("formCotizacion").addEventListener("change", programarResumen);
    $("pasajeros").addEventListener("input", actualizarContadorAcompanantes); $("pasajeros").addEventListener("change", actualizarContadorAcompanantes);
    $("btnAgregarAcompanante").addEventListener("click", () => agregarAcompanante());

    $("btnCarruselMovil")?.addEventListener("click", () => { const activo = document.querySelector("#carruselViajes .carousel-item.active"); if (activo) seleccionarDestino(activo.dataset.destino); });

    let paqueteSeleccionado = "";
    document.querySelectorAll(".btn-reservar-paquete").forEach(btn => {
        btn.addEventListener("click", function () {
            paqueteSeleccionado = this.getAttribute("data-paquete"); const texto = $("textoReserva"); const btnAccion = $("btnModalReservaAccion");
            if (estado.sesion) { texto.innerHTML = `Estás a un paso de reservar <strong>${escapeHTML(paqueteSeleccionado)}</strong>.`; btnAccion.textContent = "Ir a cotizar"; } else { texto.innerHTML = `Para reservar <strong>${escapeHTML(paqueteSeleccionado)}</strong>, primero debes iniciar sesión.`; btnAccion.textContent = "Iniciar sesión"; }
        });
    });

    $("btnModalReservaAccion")?.addEventListener("click", () => { bootstrap.Modal.getInstance($("modalReserva")).hide(); if (estado.sesion) { $("destino").value = paqueteSeleccionado; programarResumen(); $("titulo-cotizador").scrollIntoView({ behavior: "smooth", block: "center" }); mostrarToast("Destino cargado", "exito"); } else { setTimeout(() => { bootstrap.Modal.getOrCreateInstance($("modalLogin")).show(); mostrarToast("Inicia sesión", "info"); }, 400); } });

    $("logoDescuento").addEventListener("click", (e) => { e.preventDefault(); pulsoBoton(e.target); bootstrap.Modal.getOrCreateInstance($("modalDescuento")).show(); });
    $("btnAplicarCupon").addEventListener("click", aplicarCupon); $("inputCupon").addEventListener("keypress", (e) => { if (e.key === "Enter") aplicarCupon(); });

    $("eslogan").addEventListener("click", function () { this.classList.add("shimmer"); setTimeout(() => this.classList.remove("shimmer"), 3000); });
    $("btnModo").addEventListener("click", () => { const activo = document.body.classList.toggle("modo-oscuro"); try { localStorage.setItem("tema-apt", activo ? "oscuro" : "claro"); } catch (e) {} const icono = $("iconoTema"); if (activo) icono.innerHTML = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`; else icono.innerHTML = `<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>`; });

    actualizarContadorAcompanantes(); if (window.bootstrap && bootstrap.Tooltip) document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
    if ($("adminTablaClientes")) {
        cargarClientesAdmin(); cargarReservasAdmin();
        if ($("btnAdminCancelar")) $("btnAdminCancelar").addEventListener("click", cancelarEdicion);
        $("buscadorAdmin")?.addEventListener("input", filtrarAdmin);
        $("btnLimpiarBusquedaAdmin")?.addEventListener("click", () => { $("buscadorAdmin").value = ""; filtrarAdmin(); });
    }
});

function limpiarFormulario() { $("formCotizacion").reset(); $("contenedorAcompanantes").innerHTML = ""; estado.cuponAplicado = false; $("switchDescuento").checked = false; estado.totalAnterior = 0; document.querySelectorAll(".tarjeta-viaje-premium").forEach(c => c.classList.remove("seleccionada")); document.querySelectorAll(".is-valid, .is-invalid").forEach(el => el.classList.remove("is-valid", "is-invalid")); try { localStorage.removeItem("apt_carrito"); } catch (e) {} actualizarContadorAcompanantes(); programarResumen(); mostrarToast("Formulario limpiado", "info"); }
function imprimirResumen() { window.print(); }

function aplicarCupon() {
    const input = $("inputCupon"); const msg = $("mensajeCupon"); const codigo = input.value.trim().toUpperCase();
    if (codigo === "APT-VIP-10") { estado.cuponAplicado = true; $("switchDescuento").checked = true; msg.textContent = "¡Cupón aplicado! 10% de descuento."; msg.className = "alert alert-success"; msg.classList.remove("d-none"); mostrarToast("Descuento aplicado", "exito"); setTimeout(() => { bootstrap.Modal.getInstance($("modalDescuento")).hide(); input.value = ""; msg.classList.add("d-none"); programarResumen(); }, 1500); }
    else { estado.cuponAplicado = false; $("switchDescuento").checked = false; msg.textContent = "Código inválido. Intenta con APT-VIP-10."; msg.className = "alert alert-danger"; msg.classList.remove("d-none"); }
}