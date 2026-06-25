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
      let clase = recogido ? 'recogido' : (examinado ? 'examinado' : '');
      if (p.es_pin) clase += ' es-pin';
      return `
        <div class="escena-punto ${clase}" style="left:${p.x}%; top:${p.y}%;" data-punto="${p.id}" title="${p.nombre}">
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
        <p style="font-size:12px; opacity:0.7; margin:10px 0;">
          💡 Hay <strong>${escena.puntos.length}</strong> puntos clave en esta escena. Examínalos todos.
          Algunos contienen pistas críticas (notas, PINs, números).
        </p>
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
      if (punto.es_pin) {
        Motor.abrirModal(`
          <div class="modal-header"><h2 class="modal-titulo">🔑 PIN encontrado</h2></div>
          <div style="padding:30px; text-align:center;">
            <p style="opacity:0.8; margin-bottom:15px;">En la nota dice:</p>
            <p style="font-family:'IBM Plex Mono',monospace; font-size:48px; color:#d4a574; letter-spacing:8px; padding:20px; background:#1a1a1a; border:2px solid #d4a574; display:inline-block;">${punto.es_pin}</p>
            <p style="opacity:0.7; margin-top:20px; font-size:13px;">Usa este PIN para desbloquear el teléfono de la víctima.</p>
          </div>
        `);
      }
    });

    const btnPedirEl = document.getElementById('btn-pedir-policia');
    if (btnPedirEl) {
      btnPedirEl.addEventListener('click', () => pedirPolicia(punto));
    }
  }

  function pedirPolicia(punto) {
    Motor.state.solicitudesEscenaUsadas++;

    // Helper para procesar un objeto: lo recoge, asigna análisis INMEDIATO, programa SMS notificación
    const procesarObjeto = (id, nombre, analisisTexto, deForense, evidenciaId) => {
      Motor.agregarObjetoRecogido(id, nombre, `Escena → ${punto.nombre}`, analisisTexto);
      if (evidenciaId) Motor.agregarEvidencia(evidenciaId);
      if (deForense && analisisTexto) {
        Motor.programarSMSForense(deForense, analisisTexto, 8);
      }
    };

    // === Cámaras (Caso 1) ===
    if (punto.es_camaras) {
      const a = Motor.state.casoActual.analisis_forenses?.camaras;
      procesarObjeto(punto.id, 'Videos de cámaras del edificio', a?.texto, a?.de, 'video_camaras');
      Motor.guardar();
      mostrarFeedbackForense('Videos cámaras', a?.texto, 'video_camaras');
      return;
    }

    // === Objetos múltiples (Caso 1 cocina: copa+botella) ===
    if (punto.es_dos_objetos) {
      const analisis = [];
      punto.es_dos_objetos.forEach(objKey => {
        const a = Motor.state.casoActual.analisis_forenses?.[objKey];
        const nombre = objKey === 'copa_residuo' ? 'Copa con residuo' : 'Botella de vino';
        const evidId = objKey === 'copa_residuo' ? 'zolpidem_copa' : 'huellas_botella';
        if (a) {
          procesarObjeto(punto.id + '-' + objKey, nombre, a.texto, a.de, evidId);
          analisis.push({ nombre, texto: a.texto, evidId });
        }
      });
      Motor.guardar();
      mostrarFeedbackForenseMultiple(analisis);
      return;
    }

    // === ADN avanzado (Caso 2) ===
    const adn = Motor.state.casoActual.adn_avanzado?.muestras_disponibles?.find(m => m.requiere_recoger === punto.id);
    if (adn) {
      procesarObjeto(punto.id, punto.nombre, adn.resultado, 'Laboratorio ADN', adn.evidencia_desbloquea);
      Motor.guardar();
      mostrarFeedbackForense(punto.nombre, adn.resultado, adn.evidencia_desbloquea);
      return;
    }

    // === Sistema viejo Caso 1 (hardcoded por ID) ===
    const analisisKey = (() => {
      if (punto.id === 'p2') return { key:'cojin', evid:'fibras_cojin' };
      if (punto.id === 'p6') return { key:'mancha_tapete', evid:'saliva_tapete' };
      if (punto.id === 'p4') return { key:'pasaporte' };
      if (punto.id === 'p5') return { key:'plato_gato' };
      if (punto.id === 'p1') return { key:'copas_sala' };
      return null;
    })();

    const a = analisisKey ? Motor.state.casoActual.analisis_forenses?.[analisisKey.key] : null;
    procesarObjeto(punto.id, punto.nombre, a?.texto, a?.de, analisisKey?.evid);
    Motor.guardar();
    mostrarFeedbackForense(punto.nombre, a?.texto, analisisKey?.evid);
  }

  // Modal grande con el resultado forense — el jugador lo lee y cierra
  function mostrarFeedbackForense(nombre, analisis, evidId) {
    const evidNombre = evidId
      ? Motor.state.casoActual.evidencias_para_mostrar?.find(e => e.id === evidId)?.nombre
      : null;
    Motor.abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">🧪 Análisis Forense</h2>
      </div>
      <div style="padding:20px;">
        <p style="opacity:0.8; margin-bottom:10px;">📦 Objeto entregado a peritos:</p>
        <h3 style="color:#d4a574; margin-bottom:20px;">${nombre}</h3>

        <div style="background:#1a3a3a; padding:20px; border-left:4px solid #6abe6a; margin-bottom:20px;">
          <strong style="color:#6abe6a; letter-spacing:1px;">RESULTADO PRELIMINAR:</strong>
          <p style="margin-top:10px; line-height:1.6;">${analisis || 'Sin análisis disponible para este objeto.'}</p>
        </div>

        ${evidNombre ? `
          <div style="background:#5a2a2a; padding:15px; border-left:4px solid #d4a574;">
            <strong style="color:#d4a574;">📎 EVIDENCIA DESBLOQUEADA:</strong>
            <p style="margin-top:8px;">${evidNombre}</p>
            <p style="margin-top:8px; font-size:12px; opacity:0.8;">Ahora puedes mostrar esta evidencia en llamadas a sospechosos.</p>
          </div>
        ` : ''}

        <p style="opacity:0.6; font-size:12px; margin-top:20px; text-align:center;">
          Recibirás un SMS confirmando estos resultados en unos segundos.
        </p>
      </div>
    `);
  }

  function mostrarFeedbackForenseMultiple(analisisArr) {
    const bloques = analisisArr.map(a => {
      const evidNombre = a.evidId ? Motor.state.casoActual.evidencias_para_mostrar?.find(e => e.id === a.evidId)?.nombre : null;
      return `
        <div style="margin-bottom:20px;">
          <h3 style="color:#d4a574;">${a.nombre}</h3>
          <div style="background:#1a3a3a; padding:15px; border-left:4px solid #6abe6a; margin-top:8px;">
            <p>${a.texto}</p>
          </div>
          ${evidNombre ? `<p style="margin-top:8px; color:#d4a574;">📎 ${evidNombre}</p>` : ''}
        </div>
      `;
    }).join('');
    Motor.abrirModal(`
      <div class="modal-header">
        <h2 class="modal-titulo">🧪 Análisis Forense — ${analisisArr.length} muestras</h2>
      </div>
      <div style="padding:20px;">${bloques}</div>
    `);
  }

  return { abrir };

})();
