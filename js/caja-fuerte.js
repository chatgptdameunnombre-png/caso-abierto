/* ============================================================
   caja-fuerte.js — Caja fuerte de la víctima (acertijo)
   ============================================================ */

const CajaFuerte = (() => {

  function abrir() {
    if (!Motor.state.casoActual.caja_fuerte) {
      Motor.toast('No hay caja fuerte en este caso');
      return;
    }
    if (Motor.state.cajaFuerteAbierta) {
      renderContenido();
    } else {
      renderCerrada();
    }
  }

  function renderCerrada() {
    const cf = Motor.state.casoActual.caja_fuerte;
    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">🔐 ${cf.nombre}</h2></div>
      <p style="opacity:0.8; margin-bottom:15px;">📍 ${cf.ubicacion}</p>
      <p style="opacity:0.7; font-size:13px; margin-bottom:20px;">${cf.introduccion}</p>
      <div style="background:#2a2a2a; padding:25px; border:2px solid #555; text-align:center; max-width:400px; margin:0 auto;">
        <div style="font-size:64px; margin-bottom:15px;">🔐</div>
        <p style="opacity:0.8; margin-bottom:15px;">Ingrese combinación de 6 dígitos:</p>
        <input type="text" id="cf-input" maxlength="6" inputmode="numeric" placeholder="••••••"
               style="padding:15px; font-size:28px; text-align:center; letter-spacing:8px; background:#1a1a1a; color:#d4a574; border:1px solid #555; width:240px; font-family:'IBM Plex Mono',monospace;">
        <br><br>
        <button class="btn-principal" id="btn-cf-submit">Intentar</button>
        <div style="margin-top:25px; text-align:left; background:#1a1a1a; padding:15px; font-size:12px;">
          <strong style="color:#d4a574;">PISTA:</strong><br>
          ${cf.pista_resumen_para_jugador}
        </div>
      </div>
    `);
    document.getElementById('btn-cf-submit').addEventListener('click', intentar);
    document.getElementById('cf-input').addEventListener('keydown', e => { if (e.key === 'Enter') intentar(); });
  }

  function intentar() {
    const v = document.getElementById('cf-input').value;
    const ok = Motor.state.casoActual.caja_fuerte.combinacion;
    if (v === ok) {
      Motor.state.cajaFuerteAbierta = true;
      Motor.guardar();
      Motor.actualizarBadges();
      Motor.toast('🔓 Caja fuerte abierta!');
      const cf = Motor.state.casoActual.caja_fuerte;
      if (cf.evidencia_desbloquea_al_abrir) Motor.agregarEvidencia(cf.evidencia_desbloquea_al_abrir);
      renderContenido();
    } else {
      Motor.toast('Combinación incorrecta');
      document.getElementById('cf-input').value = '';
    }
  }

  function renderContenido() {
    const cf = Motor.state.casoActual.caja_fuerte;
    const items = cf.contenido.map(c => `<div class="lista-item">${c}</div>`).join('');
    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">🔓 ${cf.nombre} — Abierta</h2></div>
      <p style="opacity:0.8; margin-bottom:20px;">Contenido recuperado:</p>
      ${items}
    `);
  }

  return { abrir };

})();
