/* ============================================================
   informe.js — Presentar el caso a la fiscalía
   ============================================================ */

const Informe = (() => {

  function abrir() {
    render();
  }

  function render() {
    const c = Motor.state.casoActual;
    const evidsObt = Motor.state.evidenciasObtenidas;
    const evidsMap = {};
    c.evidencias_para_mostrar.forEach(e => { evidsMap[e.id] = e; });

    const objetosRecogidos = Motor.state.objetosRecogidos;

    // Sincronizar evidencias desde objetos recogidos (mapeo legacy del Caso 1)
    const evidsDisponibles = [...evidsObt];
    objetosRecogidos.forEach(o => {
      if (o.id === 'p2' && !evidsDisponibles.includes('fibras_cojin')) evidsDisponibles.push('fibras_cojin');
      if (o.id === 'p3-copa_residuo' && !evidsDisponibles.includes('zolpidem_copa')) evidsDisponibles.push('zolpidem_copa');
      if (o.id === 'p3-botella_vino' && !evidsDisponibles.includes('huellas_botella')) evidsDisponibles.push('huellas_botella');
      if (o.id === 'p6' && !evidsDisponibles.includes('saliva_tapete')) evidsDisponibles.push('saliva_tapete');
      if (o.id === 'p8' && !evidsDisponibles.includes('video_camaras')) evidsDisponibles.push('video_camaras');
    });

    const evidsHTML = evidsDisponibles.length === 0
      ? `<p style="opacity:0.6; padding:15px;">Aún no has recogido evidencia presentable. Investiga más.</p>`
      : evidsDisponibles.map(eid => {
          const e = evidsMap[eid];
          if (!e) return '';
          return `
            <label class="informe-evidencia-check">
              <input type="checkbox" name="evid" value="${eid}">
              <div>
                <div class="informe-evidencia-check-texto">${e.nombre}</div>
                <div class="informe-evidencia-check-fuente">📍 ${e.fuente}</div>
              </div>
            </label>
          `;
        }).join('');

    const sospechososOptions = c.sospechosos.map(s => `
      <option value="${s.id}">${s.nombre} (${s.relacion})</option>
    `).join('');

    const motivosOptions = c.opciones_informe.motivos.map(m => `
      <option value="${m.id}">${m.texto}</option>
    `).join('');

    const metodosOptions = c.opciones_informe.metodos.map(m => `
      <option value="${m.id}">${m.texto}</option>
    `).join('');

    const lugaresOptions = c.opciones_informe.lugares.map(l => `
      <option value="${l.id}">${l.texto}</option>
    `).join('');

    // Si el caso tiene cómplice, agregar dropdown opcional
    const tieneComplice = !!c.solucion.complice_id;
    const complicHTML = tieneComplice ? `
      <div class="informe-seccion">
        <div class="informe-seccion-label">2. CÓMPLICE (opcional pero recomendado)</div>
        <select id="informe-complice">
          <option value="">— Ninguno —</option>
          ${sospechososOptions}
        </select>
      </div>
    ` : '';

    Motor.abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">⚖️ Presentar caso a la fiscalía</h2>
      </div>
      <div class="informe-container">
        <h3 class="informe-titulo">INFORME FORMAL — ${c.id.toUpperCase()}</h3>
        <div class="informe-warning">
          ⚠️ Detective: cuenta con <strong>${Motor.state.intentos} intento(s) restante(s)</strong>.
          Si su acusación es incorrecta, se descontará un intento y la fiscalía le dará una pista.
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">1. CULPABLE PRINCIPAL</div>
          <select id="informe-culpable">
            <option value="">— Seleccionar sospechoso —</option>
            ${sospechososOptions}
          </select>
        </div>

        ${complicHTML}

        <div class="informe-seccion">
          <div class="informe-seccion-label">${tieneComplice ? '3' : '2'}. MOTIVO</div>
          <select id="informe-motivo">
            <option value="">— Seleccionar motivo —</option>
            ${motivosOptions}
          </select>
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">${tieneComplice ? '4' : '3'}. MÉTODO</div>
          <select id="informe-metodo">
            <option value="">— Seleccionar método —</option>
            ${metodosOptions}
          </select>
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">${tieneComplice ? '5' : '4'}. LUGAR DEL HECHO</div>
          <select id="informe-lugar">
            <option value="">— Seleccionar lugar —</option>
            ${lugaresOptions}
          </select>
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">${tieneComplice ? '6' : '5'}. EVIDENCIAS QUE SUSTENTAN LA ACUSACIÓN</div>
          <p style="font-size:12px; opacity:0.7; margin-bottom:10px;">
            Marca todas las evidencias que prueben tu caso. Mínimo <strong>${c.solucion.evidencias_minimas_requeridas}</strong> evidencias clave requeridas.
          </p>
          <div class="informe-evidencias-lista">
            ${evidsHTML}
          </div>
          <p style="font-size:11px; opacity:0.6; margin-top:8px;">
            Tienes <strong>${evidsDisponibles.length}</strong> evidencias recogidas. Las que no son clave no cuentan pero no penalizan.
          </p>
        </div>

        <div class="informe-submit">
          <button class="btn-principal" id="btn-presentar">Presentar a la fiscalía</button>
        </div>
      </div>
    `);

    document.getElementById('btn-presentar').addEventListener('click', presentar);
  }

  function presentar() {
    const c = Motor.state.casoActual;
    const culpable = document.getElementById('informe-culpable').value;
    const complice = document.getElementById('informe-complice')?.value || '';
    const motivo = document.getElementById('informe-motivo').value;
    const metodo = document.getElementById('informe-metodo').value;
    const lugar = document.getElementById('informe-lugar').value;
    const evidsCheck = [...document.querySelectorAll('input[name="evid"]:checked')].map(c => c.value);

    if (!culpable || !motivo || !metodo || !lugar) {
      Motor.toast('Complete todos los campos del informe');
      return;
    }

    const sol = c.solucion;
    const pistas = c.pistas_fiscalia_si_falla;

    const culpableOk = culpable === sol.culpable_id;
    const motivoOk = motivo === sol.motivo_correcto;
    const metodoOk = metodo === sol.metodo_correcto;
    const lugarOk = lugar === sol.lugar_correcto;

    const evidsValidas = evidsCheck.filter(e => sol.evidencias_clave_validas.includes(e));
    const evidenciaSuficiente = evidsValidas.length >= sol.evidencias_minimas_requeridas;

    // VICTORIA total
    if (culpableOk && motivoOk && metodoOk && lugarOk && evidenciaSuficiente) {
      Motor.toast('CASO RESUELTO ✓', 4000);
      setTimeout(() => Motor.ganarCaso(), 1500);
      return;
    }

    // Culpable OK pero evidencia insuficiente → NO gasta intento
    if (culpableOk && motivoOk && !evidenciaSuficiente) {
      const msg = pistas.evidencia_insuficiente || pistas.paulina_evidencia_insuficiente ||
        'Acusación correcta pero abogados defensores la van a tirar. Necesitas más evidencias clave.';
      alert(`⚖️ FISCAL:\n\n"${msg}"\n\nEl informe le es regresado. NO se descuenta intento.`);
      return;
    }

    // Culpable OK pero motivo equivocado → NO gasta intento
    if (culpableOk && !motivoOk) {
      const msg = pistas.motivo_equivocado || pistas.paulina_motivo_equivocado ||
        'Cogiste al culpable pero el motivo no cuadra. Revisa la verdadera razón.';
      alert(`⚖️ FISCAL:\n\n"${msg}"\n\nNO se descuenta intento.`);
      return;
    }

    // Culpable INCORRECTO → gasta intento
    const sospChosen = c.sospechosos.find(s => s.id === culpable);
    const pista = pistas[culpable] || pistas.default ||
      'Hay algo que no cuadra. Revisa quién tenía más que ganar con la víctima fuera del camino.';
    alert(`⚖️ FISCAL:\n\nTu acusación contra ${sospChosen.nombre} no procedió.\n\n"${pista}"\n\nSe descuenta un intento.`);
    Motor.gastarIntento();

    if (Motor.state.intentos > 0) {
      Motor.cerrarModal();
    }
  }

  return { abrir };

})();
