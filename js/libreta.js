/* ============================================================
   libreta.js — Libreta del detective
   Tabs: Notas · Sospechosos · Timeline
   ============================================================ */

const Libreta = (() => {

  let tabActiva = 'notas';

  function abrir() {
    render();
  }

  function render() {
    Motor.abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">📓 Libreta</h2>
      </div>
      <div class="libreta-tabs">
        <button class="libreta-tab ${tabActiva === 'notas' ? 'active' : ''}" data-tab="notas">📝 Notas</button>
        <button class="libreta-tab ${tabActiva === 'sospechosos' ? 'active' : ''}" data-tab="sospechosos">👤 Sospechosos</button>
        <button class="libreta-tab ${tabActiva === 'timeline' ? 'active' : ''}" data-tab="timeline">🕰️ Línea de tiempo</button>
      </div>
      <div id="libreta-contenido"></div>
    `);

    document.querySelectorAll('.libreta-tab').forEach(b => {
      b.addEventListener('click', () => {
        tabActiva = b.dataset.tab;
        render();
      });
    });

    renderContenidoTab();
  }

  function renderContenidoTab() {
    const cont = document.getElementById('libreta-contenido');
    if (tabActiva === 'notas') {
      cont.innerHTML = `
        <p style="font-size:12px; opacity:0.7; margin-bottom:10px;">
          Tus notas (se guardan automáticamente):
        </p>
        <textarea class="libreta-notas-textarea" id="libreta-notas-area">${Motor.state.notasLibreta || ''}</textarea>
      `;
      const ta = document.getElementById('libreta-notas-area');
      ta.addEventListener('input', () => {
        Motor.state.notasLibreta = ta.value;
        Motor.guardar();
      });
    }
    else if (tabActiva === 'sospechosos') {
      const html = Motor.state.casoActual.sospechosos.map(s => {
        const desc = Motor.state.sospechososDescartados.includes(s.id);
        return `
          <div class="sospechoso-ficha ${desc ? 'descartado' : ''}">
            <div class="sospechoso-ficha-nombre">${s.nombre}</div>
            <div class="sospechoso-ficha-detalle"><strong>Edad:</strong> ${s.edad}</div>
            <div class="sospechoso-ficha-detalle"><strong>Ocupación:</strong> ${s.ocupacion}</div>
            <div class="sospechoso-ficha-detalle"><strong>Relación:</strong> ${s.relacion}</div>
            <div class="sospechoso-ficha-detalle"><strong>Motivo aparente:</strong> ${s.motivo_aparente}</div>
            <div class="sospechoso-ficha-detalle"><strong>Coartada:</strong> "${s.coartada_inicial}"</div>
            <div class="sospechoso-ficha-estado ${desc ? 'descartado' : ''}">
              ${desc ? '✓ DESCARTADO' : '⚠ SOSPECHOSO'}
            </div>
          </div>
        `;
      }).join('');
      cont.innerHTML = `<div class="sospechosos-grid">${html}</div>`;
    }
    else if (tabActiva === 'timeline') {
      const eventos = Motor.state.timeline || [];
      if (eventos.length === 0) {
        cont.innerHTML = `<p style="opacity:0.7; padding:20px;">Sin eventos en la línea de tiempo todavía. Investiga y vuelve.</p>`;
        return;
      }
      cont.innerHTML = `
        <div class="timeline-lista">
          ${eventos.map(e => `
            <div class="timeline-evento">
              <div class="timeline-evento-hora">${e.hora}</div>
              <div class="timeline-evento-texto">${e.texto}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  function agregarTimelineManual(hora, texto) {
    if (!Motor.state.timeline) Motor.state.timeline = [];
    const exists = Motor.state.timeline.some(e => e.hora === hora && e.texto === texto);
    if (!exists) {
      Motor.state.timeline.push({ hora, texto });
      Motor.guardar();
    }
  }

  function agregarTimelineAutoSMS(de, texto) {
    if (!Motor.state.timeline) Motor.state.timeline = [];
    const corto = `[${de}] ${texto.substring(0, 100)}${texto.length > 100 ? '...' : ''}`;
    Motor.state.timeline.push({ hora: '— Forense', texto: corto });
    Motor.guardar();
  }

  return { abrir, render, agregarTimelineManual, agregarTimelineAutoSMS };

})();
