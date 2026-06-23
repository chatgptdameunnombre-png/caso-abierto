/* ============================================================
   llamadas.js — Tu teléfono · llamar a sospechosos
   Sistema de árboles de diálogo con ramas que se desbloquean
   con evidencia.
   ============================================================ */

const Llamadas = (() => {

  let sospechosoActivo = null;
  let respuestaActual = null;

  function abrir() {
    renderListaContactos();
  }

  function renderListaContactos() {
    const sospechosos = Motor.state.casoActual.sospechosos;
    const html = sospechosos.map(s => {
      const desc = Motor.state.sospechososDescartados.includes(s.id);
      const veces = Motor.state.contactosLlamadosVeces[s.id] || 0;
      return `
        <div class="contacto-item" data-sospechoso="${s.id}">
          <div class="contacto-info">
            <div class="contacto-nombre">${s.nombre}</div>
            <div class="contacto-detalle">${s.relacion} · ${veces > 0 ? `Llamado ${veces}x` : 'Sin llamar'}</div>
          </div>
          <div class="contacto-estado ${desc ? 'descartado' : 'sospechoso'}">
            ${desc ? 'DESCARTADO' : 'SOSPECHOSO'}
          </div>
        </div>
      `;
    }).join('');

    Motor.abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">📞 Mi teléfono — Contactos del caso</h2>
      </div>
      <p style="opacity:0.7; font-size:13px; margin-bottom:15px;">
        Llama a un contacto. Mientras más evidencia tengas en mano, más opciones se desbloquearán en cada llamada.
      </p>
      <div class="contactos-lista">${html}</div>
    `);

    document.querySelectorAll('.contacto-item').forEach(el => {
      el.addEventListener('click', () => iniciarLlamada(el.dataset.sospechoso));
    });
  }

  function iniciarLlamada(sospId) {
    sospechosoActivo = sospId;
    respuestaActual = null;
    Motor.state.contactosLlamadosVeces[sospId] = (Motor.state.contactosLlamadosVeces[sospId] || 0) + 1;
    Motor.guardar();
    renderLlamadaActiva();
    Motor.avanzarPaso();
  }

  function renderLlamadaActiva() {
    const sosp = Motor.state.casoActual.sospechosos.find(s => s.id === sospechosoActivo);
    const arbol = Motor.state.casoActual.llamadas_arboles[sospechosoActivo];
    const evidsObtenidas = Motor.state.evidenciasObtenidas;

    // Opciones iniciales
    const opcionesIniciales = arbol.nivel_inicial.map(op => `
      <button class="llamada-opcion ${op.id === 'colgar' || op.texto === 'Colgar' ? 'colgar' : ''}" data-op-id="${op.id}">
        ${op.texto}
      </button>
    `).join('');

    // Opciones desbloqueables con evidencia
    const evidenciasMap = {};
    Motor.state.casoActual.evidencias_para_mostrar.forEach(e => { evidenciasMap[e.id] = e; });

    const opcionesDesbloqueables = (arbol.desbloqueables || []).map(op => {
      const tiene = evidsObtenidas.includes(op.requiere_evidencia);
      const evidInfo = evidenciasMap[op.requiere_evidencia];
      if (tiene) {
        return `
          <button class="llamada-opcion con-evidencia" data-op-id="${op.id}" data-desbloqueable="1">
            <strong>Mostrar:</strong> ${evidInfo ? evidInfo.nombre : op.requiere_evidencia}<br>
            <span style="font-size:11px; opacity:0.85;">"${op.texto}"</span>
          </button>
        `;
      } else {
        return `
          <button class="llamada-opcion bloqueada" disabled>
            🔒 Opción bloqueada
            <span class="llamada-opcion-bloqueada-hint">Requiere: ${evidInfo ? evidInfo.nombre : op.requiere_evidencia}</span>
          </button>
        `;
      }
    }).join('');

    const respuestaHTML = respuestaActual ? `
      <div class="llamada-respuesta">
        <strong>${sosp.nombre}:</strong> "${respuestaActual}"
      </div>
    ` : `
      <div class="llamada-respuesta">
        <em>— Línea conectada. Habla detective.</em>
      </div>
    `;

    Motor.abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">📞 En llamada</h2>
        <button class="btn-link" id="btn-fin-llamada">Colgar y volver</button>
      </div>
      <div class="llamada-activa">
        <div class="llamada-activa-foto">👤</div>
        <div class="llamada-activa-nombre">${sosp.nombre}</div>
        <div class="llamada-activa-relacion">${sosp.relacion}</div>
        <div class="llamada-activa-estado">● Conectado</div>
        ${respuestaHTML}
        <div class="llamada-opciones">
          <h4 style="font-size:13px; opacity:0.7; margin:15px 0 8px; letter-spacing:1px;">PREGUNTAS BÁSICAS</h4>
          ${opcionesIniciales}
          ${opcionesDesbloqueables ? `
            <h4 style="font-size:13px; opacity:0.7; margin:20px 0 8px; letter-spacing:1px;">PRESIONAR CON EVIDENCIA 📎</h4>
            ${opcionesDesbloqueables}
          ` : ''}
        </div>
      </div>
    `);

    // Listeners
    document.getElementById('btn-fin-llamada').addEventListener('click', () => {
      sospechosoActivo = null;
      respuestaActual = null;
      renderListaContactos();
    });

    document.querySelectorAll('.llamada-opcion[data-op-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const opId = btn.dataset.opId;
        responderOpcion(opId);
      });
    });
  }

  function responderOpcion(opId) {
    const arbol = Motor.state.casoActual.llamadas_arboles[sospechosoActivo];
    let op = arbol.nivel_inicial.find(o => o.id === opId);
    let esDesbloqueable = false;
    if (!op) {
      op = arbol.desbloqueables.find(o => o.id === opId);
      esDesbloqueable = true;
    }
    if (!op) return;

    // Colgar
    if (op.texto === 'Colgar') {
      sospechosoActivo = null;
      respuestaActual = null;
      renderListaContactos();
      return;
    }

    respuestaActual = op.respuesta;

    // Cambio de estatus al usar evidencia
    if (esDesbloqueable && op.nuevo_estatus) {
      if (op.nuevo_estatus.includes('DESCARTADO')) {
        if (!Motor.state.sospechososDescartados.includes(sospechosoActivo)) {
          Motor.state.sospechososDescartados.push(sospechosoActivo);
        }
        Motor.toast(`${Motor.state.casoActual.sospechosos.find(s => s.id === sospechosoActivo).nombre}: ${op.nuevo_estatus}`);
      }
    }

    // Casos especiales
    if (esDesbloqueable && op.id === 'e_evid_camaras') {
      // Don Esteban confirma → desbloquea pista clave
      Libreta.agregarTimelineManual('3:42 AM', 'Don Esteban confirma haber visto a mujer baja, rizada, cargando bulto pesado (Paulina).');
    }

    Motor.guardar();
    Motor.avanzarPaso();
    renderLlamadaActiva();
  }

  return { abrir };

})();
