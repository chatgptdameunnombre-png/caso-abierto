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

    // Lista de evidencias disponibles para checar
    const evidsDisponibles = [...evidsObt];
    objetosRecogidos.forEach(o => {
      // Mapear objetos recogidos a sus evidencias canónicas
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
          <div class="informe-seccion-label">1. CULPABLE</div>
          <select id="informe-culpable">
            <option value="">— Seleccionar sospechoso —</option>
            ${sospechososOptions}
          </select>
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">2. MOTIVO</div>
          <select id="informe-motivo">
            <option value="">— Seleccionar motivo —</option>
            ${motivosOptions}
          </select>
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">3. MÉTODO</div>
          <select id="informe-metodo">
            <option value="">— Seleccionar método —</option>
            ${metodosOptions}
          </select>
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">4. LUGAR DEL HECHO</div>
          <select id="informe-lugar">
            <option value="">— Seleccionar lugar —</option>
            ${lugaresOptions}
          </select>
        </div>

        <div class="informe-seccion">
          <div class="informe-seccion-label">5. EVIDENCIAS QUE SUSTENTAN LA ACUSACIÓN</div>
          <p style="font-size:12px; opacity:0.7; margin-bottom:10px;">
            Marca todas las evidencias que prueben tu caso. Mínimo ${c.solucion.evidencias_minimas_requeridas} requeridas.
          </p>
          <div class="informe-evidencias-lista">
            ${evidsHTML}
          </div>
        </div>

        <div class="informe-submit">
          <button class="btn-principal" id="btn-presentar">Presentar a la fiscalía</button>
        </div>
      </div>
    `);

    document.getElementById('btn-presentar').addEventListener('click', presentar);
  }

  function presentar() {
    const culpable = document.getElementById('informe-culpable').value;
    const motivo = document.getElementById('informe-motivo').value;
    const metodo = document.getElementById('informe-metodo').value;
    const lugar = document.getElementById('informe-lugar').value;
    const evidsCheck = [...document.querySelectorAll('input[name="evid"]:checked')].map(c => c.value);

    if (!culpable || !motivo || !metodo || !lugar) {
      Motor.toast('Complete todos los campos del informe');
      return;
    }

    const sol = Motor.state.casoActual.solucion;
    const pistas = Motor.state.casoActual.pistas_fiscalia_si_falla;

    // Validaciones
    const culpableOk = culpable === sol.culpable_id;
    const motivoOk = motivo === sol.motivo_correcto;
    const metodoOk = metodo === sol.metodo_correcto;
    const lugarOk = lugar === sol.lugar_correcto;

    const evidsValidas = evidsCheck.filter(e => sol.evidencias_clave_validas.includes(e));
    const evidenciaSuficiente = evidsValidas.length >= sol.evidencias_minimas_requeridas;

    // Si todo OK → VICTORIA
    if (culpableOk && motivoOk && metodoOk && lugarOk && evidenciaSuficiente) {
      Motor.toast('CASO RESUELTO ✓', 4000);
      setTimeout(() => Motor.ganarCaso(), 1500);
      return;
    }

    // Si culpable OK pero evidencia insuficiente → no gasta intento, regresa
    if (culpableOk && motivoOk && !evidenciaSuficiente) {
      alert(`⚖️ FISCAL:\n\n"${pistas.paulina_evidencia_insuficiente}"\n\nEl informe le es regresado. NO se descuenta intento.`);
      return;
    }

    // Si culpable OK pero motivo equivocado → no gasta intento, regresa
    if (culpableOk && !motivoOk) {
      alert(`⚖️ FISCAL:\n\n"${pistas.paulina_motivo_equivocado}"\n\nNO se descuenta intento.`);
      return;
    }

    // Culpable INCORRECTO → gasta intento
    const sospChosen = Motor.state.casoActual.sospechosos.find(s => s.id === culpable);
    const pista = pistas[culpable] || pistas.default;
    alert(`⚖️ FISCAL:\n\nTu acusación contra ${sospChosen.nombre} no procedió.\n\n"${pista}"\n\nSe descuenta un intento.`);
    Motor.gastarIntento();

    if (Motor.state.intentos > 0) {
      // Regresar al escritorio (cerrar modal)
      Motor.cerrarModal();
    }
  }

  return { abrir };

})();
