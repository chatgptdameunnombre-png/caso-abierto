/* ============================================================
   escena.js — Escena del crimen
   Foto con puntos clave. Por punto: anotar o pedir a policía.
   ============================================================ */

const Escena = (() => {

  let puntoSeleccionado = null;

  function abrir() {
    render();
  }

  function render() {
    const escena = Motor.state.casoActual.escena_crimen;
    const max = escena.max_solicitudes_policia;
    const usadas = Motor.state.solicitudesEscenaUsadas;

    const puntosHTML = escena.puntos.map(p => {
      const examinado = Motor.state.puntosEscenaExaminados.includes(p.id);
      const recogido = Motor.state.objetosRecogidos.some(o => o.id.startsWith(p.id));
      const clase = recogido ? 'recogido' : (examinado ? 'examinado' : '');
      return `
        <div class="escena-punto ${clase}" style="left:${p.x}%; top:${p.y}%;" data-punto="${p.id}">
          ${p.id.replace('p', '')}
        </div>
      `;
    }).join('');

    Motor.abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">📸 Escena del crimen</h2>
      </div>
      <div class="escena-container">
        <div class="escena-titulo"><strong>${escena.ubicacion}</strong></div>
        <div class="escena-info">${escena.descripcion_general}</div>
        <div class="escena-solicitudes">
          Solicitudes a policía: ${max - usadas} / ${max} restantes
        </div>
        <div class="escena-imagen-wrap">
          <div class="escena-imagen-placeholder">
            [ Aquí va la imagen de la escena · Claude Design la reemplaza ]<br>
            <span style="opacity:0.5; font-size:12px;">Mientras tanto, los puntos numerados son clicables.</span>
          </div>
          ${puntosHTML}
        </div>
        <div id="escena-zoom-area"></div>
      </div>
    `);

    document.querySelectorAll('.escena-punto').forEach(el => {
      el.addEventListener('click', () => mostrarZoom(el.dataset.punto));
    });
  }

  function mostrarZoom(puntoId) {
    const punto = Motor.state.casoActual.escena_crimen.puntos.find(p => p.id === puntoId);
    if (!punto) return;
    puntoSeleccionado = punto;

    if (!Motor.state.puntosEscenaExaminados.includes(puntoId)) {
      Motor.state.puntosEscenaExaminados.push(puntoId);
      Motor.guardar();
    }

    const yaRecogido = Motor.state.objetosRecogidos.some(o => o.id.startsWith(puntoId));
    const sinSolicitudes = Motor.state.solicitudesEscenaUsadas >= Motor.state.casoActual.escena_crimen.max_solicitudes_policia;

    let btnPedir = '';
    if (punto.puede_recoger && !yaRecogido && !sinSolicitudes) {
      btnPedir = `<button id="btn-pedir-policia">📋 Pedir a la policía que lo recoja</button>`;
    } else if (yaRecogido) {
      btnPedir = `<button disabled>✓ Ya entregado a forense</button>`;
    } else if (sinSolicitudes) {
      btnPedir = `<button disabled>Sin solicitudes restantes</button>`;
    } else {
      btnPedir = `<button disabled>No es un objeto físico</button>`;
    }

    const area = document.getElementById('escena-zoom-area');
    area.innerHTML = `
      <div class="escena-zoom">
        <div class="escena-zoom-titulo">🔍 ${punto.nombre}</div>
        <div class="escena-zoom-descripcion">${punto.zoom_descripcion}</div>
        <div class="escena-zoom-acciones">
          ${btnPedir}
          <button id="btn-anotar-libreta">✏️ Anotar en libreta</button>
        </div>
      </div>
    `;

    document.getElementById('btn-anotar-libreta').addEventListener('click', () => {
      const notaActual = Motor.state.notasLibreta || '';
      const nueva = punto.auto_nota || `Observación: ${punto.nombre}`;
      if (!notaActual.includes(nueva)) {
        Motor.state.notasLibreta = notaActual + (notaActual ? '\n\n' : '') + `[Escena] ${nueva}`;
        Motor.guardar();
        Motor.toast('Anotado en libreta');
      } else {
        Motor.toast('Ya estaba anotado');
      }
      // Si el punto contiene el PIN, además mostrarlo
      if (punto.es_pin) {
        Motor.toast(`PIN encontrado: ${punto.es_pin}`);
      }
    });

    const btnPedirEl = document.getElementById('btn-pedir-policia');
    if (btnPedirEl) {
      btnPedirEl.addEventListener('click', () => pedirPolicia(punto));
    }
  }

  function pedirPolicia(punto) {
    Motor.state.solicitudesEscenaUsadas++;
    Motor.guardar();

    // Cámaras tienen flujo especial
    if (punto.es_camaras) {
      const a = Motor.state.casoActual.analisis_forenses.camaras;
      Motor.programarSMSForense(a.de, a.texto, 2);
      Motor.agregarObjetoRecogido(punto.id, 'Videos de cámaras del edificio', `Escena → ${punto.nombre}`, null);
      // Cuando llegue el SMS, registrar análisis
      setTimeout(() => {
        const obj = Motor.state.objetosRecogidos.find(o => o.id === punto.id);
        if (obj) {
          obj.analisis = a.texto;
          Motor.guardar();
        }
      }, 100);
      Motor.agregarEvidencia('video_camaras');
      Motor.toast('Solicitud enviada a peritos. Análisis llegará por SMS.');
      render();
      return;
    }

    // Objetos múltiples (cocina: copa+botella)
    if (punto.es_dos_objetos) {
      punto.es_dos_objetos.forEach(objKey => {
        const a = Motor.state.casoActual.analisis_forenses[objKey];
        if (a) {
          const nombre = objKey === 'copa_residuo' ? 'Copa con residuo' : 'Botella de vino';
          Motor.agregarObjetoRecogido(punto.id + '-' + objKey, nombre, `Escena → ${punto.nombre}`, null);
          Motor.programarSMSForense(a.de, a.texto, 2);
          setTimeout(() => {
            const obj = Motor.state.objetosRecogidos.find(o => o.id === punto.id + '-' + objKey);
            if (obj) { obj.analisis = a.texto; Motor.guardar(); }
          }, 100);
          if (objKey === 'copa_residuo') Motor.agregarEvidencia('zolpidem_copa');
          if (objKey === 'botella_vino') Motor.agregarEvidencia('huellas_botella');
        }
      });
      Motor.toast('Solicitud enviada. 2 objetos en análisis.');
      render();
      return;
    }

    // Objeto único
    const analisisKey = (() => {
      if (punto.id === 'p2') return 'cojin';
      if (punto.id === 'p6') return 'mancha_tapete';
      if (punto.id === 'p4') return 'pasaporte';
      if (punto.id === 'p5') return 'plato_gato';
      if (punto.id === 'p1') return 'copas_sala';
      return null;
    })();

    const a = analisisKey ? Motor.state.casoActual.analisis_forenses[analisisKey] : null;
    Motor.agregarObjetoRecogido(punto.id, punto.nombre, `Escena → ${punto.nombre}`, null);
    if (a) {
      Motor.programarSMSForense(a.de, a.texto, 2);
      setTimeout(() => {
        const obj = Motor.state.objetosRecogidos.find(o => o.id === punto.id);
        if (obj) { obj.analisis = a.texto; Motor.guardar(); }
      }, 100);
    }
    if (analisisKey === 'cojin') Motor.agregarEvidencia('fibras_cojin');
    if (analisisKey === 'mancha_tapete') Motor.agregarEvidencia('saliva_tapete');

    Motor.toast('Solicitud enviada. Análisis llegará por SMS.');
    render();
  }

  return { abrir };

})();
