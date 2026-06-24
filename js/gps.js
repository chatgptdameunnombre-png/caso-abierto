/* ============================================================
   gps.js — GPS del carro de la víctima
   ============================================================ */

const GPS = (() => {

  function abrir() {
    if (!Motor.state.casoActual.gps_carro) {
      Motor.toast('No hay GPS en este caso');
      return;
    }
    render();
  }

  function render() {
    const g = Motor.state.casoActual.gps_carro;
    const html = g.rutas.map(r => {
      const sospechosa = r.ruta.includes('🚩');
      return `
        <div class="timeline-evento" style="${sospechosa ? 'border-left:3px solid #be4a4a;' : ''}">
          <div class="timeline-evento-hora">${r.fecha}</div>
          <div class="timeline-evento-texto">${r.ruta}</div>
        </div>
      `;
    }).join('');

    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">📍 ${g.nombre}</h2></div>
      <p style="opacity:0.7; font-size:13px; margin-bottom:20px;">${g.introduccion}</p>
      <div class="timeline-lista">${html}</div>
      <p style="opacity:0.6; font-size:12px; margin-top:20px;">🚩 = parada sospechosa</p>
    `);

    if (g.evidencia_desbloquea) {
      Motor.agregarEvidencia(g.evidencia_desbloquea);
    }
    Motor.avanzarPaso();
  }

  return { abrir };

})();
