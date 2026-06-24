/* ============================================================
   motor.js — Núcleo del juego
   Maneja estado global, navegación entre pantallas, save game,
   intentos y arranque.
   ============================================================ */

const Motor = (() => {

  const STORAGE_KEY = 'caso-abierto-save';
  const CASOS_DISPONIBLES = ['caso-1', 'caso-2']; // caso-3 se agrega luego

  // Definición de módulos disponibles (todos)
  const MODULOS_DEF = {
    'expediente':       { icono:'📁', nombre:'Expediente',         info:'Caso oficial' },
    'telefono-victima': { icono:'📱', nombre:'Teléfono víctima',   info:'🔒 Bloqueado' },
    'computadora':      { icono:'💻', nombre:'Computadora',        info:'🔒 Con password' },
    'tu-telefono':      { icono:'📞', nombre:'Mi teléfono',         info:'Llamar contactos' },
    'escena':           { icono:'📸', nombre:'Escena del crimen',   info:'' },
    'camaras':          { icono:'📹', nombre:'Cámaras seguridad',   info:'Clips de video' },
    'banco':            { icono:'🏦', nombre:'Reporte bancario',    info:'Cuentas sospechosos' },
    'gps':              { icono:'📍', nombre:'GPS del carro',       info:'Rutas y paradas' },
    'caja-fuerte':      { icono:'🔐', nombre:'Caja fuerte',         info:'Combinación 6 dígitos' },
    'libreta':          { icono:'📓', nombre:'Libreta',             info:'Notas + sospechosos' },
    'evidencias':       { icono:'📦', nombre:'Evidencia recogida',  info:'0 piezas' },
    'informe':          { icono:'⚖️', nombre:'Presentar caso',      info:'a la fiscalía', destacado:true }
  };

  const MODULOS_DEFAULT_CASO_1 = [
    'expediente','telefono-victima','tu-telefono','escena',
    'libreta','evidencias','informe'
  ];

  let state = {
    casoActual: null,
    casoActualId: null,
    intentos: 3,
    telefonoDesbloqueado: false,
    computadoraDesbloqueada: false,
    cajaFuerteAbierta: false,
    camarasRevisadas: [],
    adnSolicitados: [],
    chatsBorradosRecuperados: [],
    puntosEscenaExaminados: [],
    objetosRecogidos: [],
    solicitudesEscenaUsadas: 0,
    evidenciasObtenidas: [],
    notasLibreta: '',
    sospechososDescartados: [],
    timeline: [],
    forenseEnCola: [],
    eventosTiempoRealDisparados: [],
    pasosAcumulados: 0,
    casosResueltos: [],
    contactosLlamadosVeces: {}
  };

  // ---- Save game ----
  function guardar() {
    try {
      const dataParaGuardar = {
        casoActualId: state.casoActualId,
        intentos: state.intentos,
        telefonoDesbloqueado: state.telefonoDesbloqueado,
        chatsBorradosRecuperados: state.chatsBorradosRecuperados,
        puntosEscenaExaminados: state.puntosEscenaExaminados,
        objetosRecogidos: state.objetosRecogidos,
        solicitudesEscenaUsadas: state.solicitudesEscenaUsadas,
        evidenciasObtenidas: state.evidenciasObtenidas,
        notasLibreta: state.notasLibreta,
        sospechososDescartados: state.sospechososDescartados,
        timeline: state.timeline,
        pasosAcumulados: state.pasosAcumulados,
        casosResueltos: state.casosResueltos,
        contactosLlamadosVeces: state.contactosLlamadosVeces,
        forenseEnCola: state.forenseEnCola
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataParaGuardar));
    } catch (e) {
      console.warn('No se pudo guardar', e);
    }
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function reiniciarTodo() {
    if (!confirm('¿Reiniciar TODO el progreso? Esta acción no se puede deshacer.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function reiniciarCaso() {
    state.intentos = 3;
    state.telefonoDesbloqueado = false;
    state.computadoraDesbloqueada = false;
    state.cajaFuerteAbierta = false;
    state.camarasRevisadas = [];
    state.adnSolicitados = [];
    state.chatsBorradosRecuperados = [];
    state.puntosEscenaExaminados = [];
    state.objetosRecogidos = [];
    state.solicitudesEscenaUsadas = 0;
    state.evidenciasObtenidas = [];
    state.notasLibreta = '';
    state.sospechososDescartados = [];
    state.timeline = construirTimelineInicial();
    state.pasosAcumulados = 0;
    state.contactosLlamadosVeces = {};
    state.forenseEnCola = [];
    state.eventosTiempoRealDisparados = [];
    guardar();
  }

  function construirTimelineInicial() {
    if (!state.casoActual) return [];
    return state.casoActual.briefing.ultima_actividad.map(a => ({
      hora: a.hora,
      texto: a.evento,
      autoGenerado: true
    }));
  }

  // ---- Navegación entre pantallas ----
  function mostrarPantalla(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  // ---- Cargar caso desde JSON ----
  async function cargarCasoJSON(id) {
    const res = await fetch(`data/${id}.json`);
    if (!res.ok) throw new Error('No se pudo cargar el caso ' + id);
    return await res.json();
  }

  // ---- Pantalla inicio ----
  async function renderInicio() {
    const cont = document.getElementById('contenedor-sobres');
    cont.innerHTML = '';

    for (let i = 0; i < 3; i++) {
      const casoId = CASOS_DISPONIBLES[i];
      const div = document.createElement('div');
      div.className = 'sobre';

      if (casoId) {
        try {
          const caso = await cargarCasoJSON(casoId);
          const resuelto = state.casosResueltos.includes(casoId);
          if (resuelto) div.classList.add('resuelto');

          div.innerHTML = `
            <div class="sobre-estado">${resuelto ? 'CERRADO' : 'ABIERTO'}</div>
            <div class="sobre-bandera">${caso.bandera}</div>
            <div class="sobre-numero">Caso ${i + 1}</div>
            <div class="sobre-titulo">${caso.titulo}</div>
            <div class="sobre-ubicacion">${caso.ubicacion}</div>
            <div class="sobre-resumen">${caso.sobre_resumen}</div>
          `;
          div.addEventListener('click', () => abrirCaso(casoId));
        } catch {
          div.classList.add('cerrado');
          div.innerHTML = `<div class="sobre-estado">ERROR</div><div class="sobre-bandera">⚠️</div><div class="sobre-titulo">Caso ${i + 1}</div>`;
        }
      } else {
        div.classList.add('cerrado');
        div.innerHTML = `
          <div class="sobre-estado">PRÓXIMAMENTE</div>
          <div class="sobre-bandera">🔒</div>
          <div class="sobre-numero">Caso ${i + 1}</div>
          <div class="sobre-titulo">Por publicar</div>
          <div class="sobre-ubicacion">${i === 1 ? '🇺🇸 USA' : '🇪🇸 Europa'}</div>
        `;
      }
      cont.appendChild(div);
    }
  }

  async function abrirCaso(id) {
    state.casoActual = await cargarCasoJSON(id);
    state.casoActualId = id;
    renderBriefing();
    mostrarPantalla('briefing');
  }

  // ---- Pantalla briefing ----
  function renderBriefing() {
    const c = state.casoActual;
    const cont = document.getElementById('expediente-papel');
    cont.innerHTML = `
      <h2>${c.briefing.titulo}</h2>
      <p style="opacity:0.7; margin-bottom:20px;">${c.briefing.subtitulo}</p>

      <h3>VÍCTIMA</h3>
      <p><strong>${c.victima.nombre}</strong>, ${c.victima.edad} años · ${c.victima.ocupacion}<br>
      ${c.victima.direccion}</p>

      <h3>HECHOS</h3>
      <ul>${c.briefing.hechos.map(h => `<li>${h}</li>`).join('')}</ul>

      <h3>ÚLTIMA ACTIVIDAD CONFIRMADA</h3>
      <ul>${c.briefing.ultima_actividad.map(a => `<li><strong>${a.hora}</strong> — ${a.evento}</li>`).join('')}</ul>

      <h3>OBSERVACIONES</h3>
      <p>${c.briefing.observaciones}</p>

      <h3>CONTACTOS RELEVANTES</h3>
      <ul>${c.sospechosos.map(s => `<li><strong>${s.nombre}</strong> — ${s.relacion} · tel ${s.telefono}</li>`).join('')}</ul>

      <div class="nota-jefe">"${c.briefing.nota_jefe}"</div>
    `;
  }

  function aceptarCaso() {
    // Si el caso ya estaba en progreso, no reiniciar
    const guardado = cargar();
    if (!guardado || guardado.casoActualId !== state.casoActualId) {
      reiniciarCaso();
    }
    mostrarPantalla('escritorio');
    renderEscritorio();
  }

  // ---- Pantalla escritorio ----
  function renderEscritorio() {
    const c = state.casoActual;
    document.getElementById('caso-bandera').textContent = c.bandera;
    document.getElementById('caso-titulo').textContent = c.titulo;
    renderModulos();
    actualizarIntentosVisual();
    actualizarBadges();
  }

  let delegationHandlerInstalado = false;
  function renderModulos() {
    const main = document.querySelector('#screen-escritorio .escritorio');
    if (!main) return;
    const lista = state.casoActual.modulos_disponibles || MODULOS_DEFAULT_CASO_1;
    main.innerHTML = '';
    lista.forEach(mid => {
      const def = MODULOS_DEF[mid];
      if (!def) return;
      const div = document.createElement('div');
      div.className = 'modulo' + (def.destacado ? ' destacado' : '');
      div.dataset.modulo = mid;
      div.innerHTML = `
        <div class="modulo-icono">${def.icono}</div>
        <div class="modulo-nombre">${def.nombre}</div>
        <div class="modulo-info" data-modulo-info="${mid}">${def.info}</div>
      `;
      main.appendChild(div);
    });
    if (!delegationHandlerInstalado) {
      main.addEventListener('click', (e) => {
        const m = e.target.closest('.modulo');
        if (m && m.dataset.modulo) abrirModulo(m.dataset.modulo);
      });
      delegationHandlerInstalado = true;
    }
  }

  function abrirModulo(mid) {
    try {
      switch (mid) {
        case 'expediente':       Motor.abrirExpedienteDesdeEscritorio(); break;
        case 'telefono-victima': Telefono.abrir(); break;
        case 'computadora':      Computadora.abrir(); break;
        case 'tu-telefono':      Llamadas.abrir(); break;
        case 'escena':           Escena.abrir(); break;
        case 'camaras':          Camaras.abrir(); break;
        case 'banco':            Banco.abrir(); break;
        case 'gps':              GPS.abrir(); break;
        case 'caja-fuerte':      CajaFuerte.abrir(); break;
        case 'libreta':          Libreta.abrir(); break;
        case 'evidencias':       Motor.abrirEvidencias(); break;
        case 'informe':          Informe.abrir(); break;
        default: console.warn('Módulo desconocido:', mid);
      }
    } catch (e) {
      console.error('Error abriendo módulo', mid, e);
      Motor.toast('Error al abrir ' + mid);
    }
  }

  function actualizarIntentosVisual() {
    const visual = '●'.repeat(state.intentos) + '○'.repeat(3 - state.intentos);
    document.getElementById('intentos-visual').textContent = visual;
  }

  function actualizarBadges() {
    setBadge('telefono-victima', state.telefonoDesbloqueado ? 'Desbloqueado' : '🔒 Bloqueado');
    setBadge('evidencias', state.objetosRecogidos.length + ' piezas');
    if (state.casoActual.escena_crimen) {
      const max = state.casoActual.escena_crimen.max_solicitudes_policia;
      setBadge('escena', `${max - state.solicitudesEscenaUsadas} solicitudes`);
    }
    if (state.casoActual.computadora_padre) {
      setBadge('computadora', state.computadoraDesbloqueada ? 'Desbloqueada' : '🔒 Password');
    }
    if (state.casoActual.caja_fuerte) {
      setBadge('caja-fuerte', state.cajaFuerteAbierta ? '✓ Abierta' : '🔐 Cerrada');
    }
  }
  function setBadge(mid, txt) {
    const el = document.querySelector(`[data-modulo-info="${mid}"]`);
    if (el) el.textContent = txt;
  }

  // ---- Modal genérico ----
  function abrirModal(htmlContenido) {
    document.getElementById('modal-contenido').innerHTML = htmlContenido;
    document.getElementById('modal-overlay').classList.add('active');
  }
  function cerrarModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('modal-contenido').innerHTML = '';
    // Refrescar badges al cerrar (puede haber cambios)
    actualizarBadges();
  }

  // ---- Toast ----
  function toast(texto, ms = 2800) {
    const t = document.getElementById('toast');
    t.textContent = texto;
    t.classList.add('activo');
    setTimeout(() => t.classList.remove('activo'), ms);
  }

  // ---- Notificación SMS estilo iPhone ----
  function notificacionSMS(de, texto, callback) {
    const cont = document.getElementById('notificaciones');
    const div = document.createElement('div');
    div.className = 'notif-sms';
    div.innerHTML = `
      <div class="notif-sms-cabecera">
        <span class="notif-sms-de">${de}</span>
        <span>SMS</span>
      </div>
      <div class="notif-sms-texto">${texto}</div>
    `;
    div.addEventListener('click', () => {
      div.remove();
      if (callback) callback();
    });
    cont.appendChild(div);
    setTimeout(() => { if (div.parentNode) div.remove(); }, 18000);
  }

  // ---- Forense en cola (llega tras N pasos del jugador) ----
  function programarSMSForense(de, texto, pasosEspera = 2) {
    state.forenseEnCola.push({
      de, texto,
      pasoEnQueLlega: state.pasosAcumulados + pasosEspera
    });
    guardar();
  }

  function avanzarPaso() {
    state.pasosAcumulados++;
    const listos = state.forenseEnCola.filter(s => s.pasoEnQueLlega <= state.pasosAcumulados);
    listos.forEach(s => {
      notificacionSMS(s.de, s.texto);
      Libreta.agregarTimelineAutoSMS(s.de, s.texto);
    });
    state.forenseEnCola = state.forenseEnCola.filter(s => s.pasoEnQueLlega > state.pasosAcumulados);

    // Eventos en tiempo real definidos en el JSON del caso
    const eventos = state.casoActual?.eventos_tiempo_real || [];
    eventos.forEach((ev, idx) => {
      if (ev.paso <= state.pasosAcumulados && !state.eventosTiempoRealDisparados.includes(idx)) {
        state.eventosTiempoRealDisparados.push(idx);
        notificacionSMS(ev.de, ev.texto);
        Libreta.agregarTimelineAutoSMS(ev.de, ev.texto);
      }
    });
    guardar();
  }

  // ---- Agregar evidencia a la "bolsa" de evidencia disponible ----
  function agregarEvidencia(id) {
    if (!state.evidenciasObtenidas.includes(id)) {
      state.evidenciasObtenidas.push(id);
      guardar();
    }
  }

  function agregarObjetoRecogido(id, nombre, fuente, analisisTexto) {
    const yaExiste = state.objetosRecogidos.find(o => o.id === id);
    if (yaExiste) return;
    state.objetosRecogidos.push({
      id, nombre, fuente,
      analisis: analisisTexto || null
    });
    guardar();
  }

  // ---- Intentos ----
  function gastarIntento() {
    state.intentos--;
    guardar();
    actualizarIntentosVisual();
    if (state.intentos <= 0) {
      mostrarDerrota();
    }
  }

  // ---- Victoria ----
  function ganarCaso() {
    if (!state.casosResueltos.includes(state.casoActualId)) {
      state.casosResueltos.push(state.casoActualId);
    }
    guardar();
    const cont = document.getElementById('epilogo-cards');
    cont.innerHTML = state.casoActual.epilogo.map(t =>
      `<div class="epilogo-card">${t}</div>`
    ).join('');
    mostrarPantalla('epilogo');
  }

  function mostrarDerrota() {
    const culp = state.casoActual.sospechosos.find(s => s.id === state.casoActual.solucion.culpable_id);
    document.getElementById('culpable-revelado').textContent = culp.nombre;
    mostrarPantalla('derrota');
  }

  // ---- Init ----
  function init() {
    // Cargar save game si existe
    const saved = cargar();
    if (saved) {
      Object.assign(state, saved);
    }

    // Botones globales
    document.getElementById('modal-cerrar').addEventListener('click', cerrarModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') cerrarModal();
    });

    document.querySelectorAll('[data-volver]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.volver;
        mostrarPantalla(a);
        if (a === 'inicio') renderInicio();
      });
    });

    document.getElementById('btn-aceptar-caso').addEventListener('click', aceptarCaso);
    document.getElementById('btn-reiniciar-todo').addEventListener('click', reiniciarTodo);
    document.getElementById('btn-salir-escritorio').addEventListener('click', () => {
      guardar();
      mostrarPantalla('inicio');
      renderInicio();
    });
    document.getElementById('btn-volver-menu').addEventListener('click', () => {
      mostrarPantalla('inicio');
      renderInicio();
    });
    document.getElementById('btn-derrota-menu').addEventListener('click', () => {
      mostrarPantalla('inicio');
      renderInicio();
    });
    document.getElementById('btn-reintentar-caso').addEventListener('click', () => {
      reiniciarCaso();
      renderEscritorio();
      mostrarPantalla('escritorio');
    });

    // Módulos del escritorio se inyectan dinámicamente en renderModulos()
    renderInicio();
    mostrarPantalla('inicio');
  }

  function abrirExpedienteDesdeEscritorio() {
    const c = state.casoActual;
    abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">📁 Expediente ${c.id.toUpperCase()}</h2>
      </div>
      <div class="expediente-papel" style="margin:0;">
        <h2>${c.briefing.titulo}</h2>
        <h3>VÍCTIMA</h3>
        <p><strong>${c.victima.nombre}</strong>, ${c.victima.edad} años · ${c.victima.ocupacion}<br>${c.victima.direccion}</p>
        <h3>HECHOS</h3>
        <ul>${c.briefing.hechos.map(h => `<li>${h}</li>`).join('')}</ul>
        <h3>ÚLTIMA ACTIVIDAD CONFIRMADA</h3>
        <ul>${c.briefing.ultima_actividad.map(a => `<li><strong>${a.hora}</strong> — ${a.evento}</li>`).join('')}</ul>
        <h3>CONTACTOS RELEVANTES</h3>
        <ul>${c.sospechosos.map(s => `<li><strong>${s.nombre}</strong> — ${s.relacion} · tel ${s.telefono}</li>`).join('')}</ul>
        <div class="nota-jefe">"${c.briefing.nota_jefe}"</div>
      </div>
    `);
  }

  function abrirEvidencias() {
    if (state.objetosRecogidos.length === 0) {
      abrirModal(`
        <div class="modal-header"><h2 class="modal-titulo">📦 Evidencia recogida</h2></div>
        <p style="opacity:0.7; padding:20px;">Aún no has recogido ninguna evidencia física. Visita la escena del crimen y solicita a la policía que recoja objetos clave.</p>
      `);
      return;
    }
    const html = state.objetosRecogidos.map(o => `
      <div class="evidencia-item">
        <div class="evidencia-item-nombre">${o.nombre}</div>
        <div class="evidencia-item-fuente">📍 ${o.fuente}</div>
        ${o.analisis ? `<div class="evidencia-item-analisis">${o.analisis}</div>` : ''}
      </div>
    `).join('');
    abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">📦 Evidencia recogida</h2></div>
      <div class="evidencias-lista">${html}</div>
    `);
  }

  return {
    init, state,
    mostrarPantalla, renderInicio, renderEscritorio,
    abrirModal, cerrarModal, toast, notificacionSMS,
    programarSMSForense, avanzarPaso,
    agregarEvidencia, agregarObjetoRecogido,
    gastarIntento, ganarCaso, mostrarDerrota,
    guardar, actualizarBadges,
    abrirExpedienteDesdeEscritorio, abrirEvidencias
  };

})();
