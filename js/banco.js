/* ============================================================
   banco.js — Reporte bancario de los sospechosos
   ============================================================ */

const Banco = (() => {

  function abrir() {
    if (!Motor.state.casoActual.reporte_bancario) {
      Motor.toast('No hay reporte bancario en este caso');
      return;
    }
    render();
  }

  function render() {
    const rb = Motor.state.casoActual.reporte_bancario;
    const html = rb.cuentas.map(c => `
      <div class="lista-item" style="margin-bottom:15px;">
        <div class="lista-item-titulo" style="font-size:15px; color:#d4a574;">💰 ${c.titular}</div>
        <div class="lista-item-preview" style="margin-top:8px; line-height:1.6;">${c.resumen}</div>
      </div>
    `).join('');

    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">🏦 ${rb.nombre}</h2></div>
      <p style="opacity:0.7; font-size:13px; margin-bottom:20px;">${rb.introduccion}</p>
      ${html}
    `);

    // Desbloquear evidencias por revisar el reporte completo
    rb.cuentas.forEach(c => {
      if (c.evidencia_desbloquea) {
        Motor.agregarEvidencia(c.evidencia_desbloquea);
      }
    });
    Motor.avanzarPaso();
  }

  return { abrir };

})();
