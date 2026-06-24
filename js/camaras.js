/* ============================================================
   camaras.js — Cámaras de seguridad (clips de video)
   ============================================================ */

const Camaras = (() => {

  function abrir() {
    if (!Motor.state.casoActual.camaras_seguridad) {
      Motor.toast('No hay cámaras en este caso');
      return;
    }
    renderLista();
  }

  function renderLista() {
    const cs = Motor.state.casoActual.camaras_seguridad;
    const html = cs.clips.map(c => {
      const revisada = Motor.state.camarasRevisadas.includes(c.id);
      return `
        <div class="lista-item" style="cursor:pointer;" data-camara="${c.id}">
          <div class="lista-item-titulo">${revisada ? '✓ ' : '▶ '}${c.titulo}</div>
          <div class="lista-item-fecha">${c.hora} · ${c.duracion}</div>
          <div class="lista-item-preview">${c.descripcion}</div>
        </div>
      `;
    }).join('');

    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">📹 ${cs.nombre}</h2></div>
      <p style="opacity:0.7; font-size:13px; margin-bottom:15px;">
        Clips disponibles. Al revisar cada uno, descubres detalles ocultos que se agregan a tu evidencia.
      </p>
      ${html}
    `);

    document.querySelectorAll('[data-camara]').forEach(el => {
      el.addEventListener('click', () => verClip(el.dataset.camara));
    });
  }

  function verClip(id) {
    const c = Motor.state.casoActual.camaras_seguridad.clips.find(x => x.id === id);
    if (!c) return;

    if (!Motor.state.camarasRevisadas.includes(id)) {
      Motor.state.camarasRevisadas.push(id);
      if (c.evidencia_desbloquea) {
        Motor.agregarEvidencia(c.evidencia_desbloquea);
      }
      Motor.guardar();
      Motor.avanzarPaso();
    }

    const detallesHTML = c.detalles_ocultos.map(d => `<li style="margin:6px 0;">${d}</li>`).join('');

    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">📹 ${c.titulo}</h2></div>
      <div style="background:#000; padding:40px; text-align:center; margin-bottom:20px; border:1px solid #444;">
        <div style="font-size:64px; margin-bottom:10px;">📹</div>
        <p style="opacity:0.7;">${c.hora} · duración: ${c.duracion}</p>
        <p style="margin-top:15px; font-style:italic;">"${c.descripcion}"</p>
      </div>
      <div style="background:#1a3a3a; padding:20px; border-left:3px solid #6abe6a;">
        <h4 style="margin-bottom:10px; color:#6abe6a; letter-spacing:1px;">🔍 ANÁLISIS DETECTIVE</h4>
        <ul style="padding-left:20px;">${detallesHTML}</ul>
      </div>
      <div style="text-align:center; margin-top:20px;">
        <button class="btn-link" id="btn-camara-volver">← Volver a la lista</button>
      </div>
    `);

    document.getElementById('btn-camara-volver').addEventListener('click', renderLista);
  }

  return { abrir };

})();
