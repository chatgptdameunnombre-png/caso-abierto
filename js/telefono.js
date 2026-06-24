/* ============================================================
   telefono.js — Teléfono de la víctima (apps navegables)
   ============================================================ */

const Telefono = (() => {

  let vistaActual = 'home'; // home | nombre_app | chat_id

  function abrir() {
    vistaActual = 'home';
    render();
  }

  function render() {
    if (!Motor.state.telefonoDesbloqueado) {
      renderPantallaPIN();
      return;
    }
    if (vistaActual === 'home') renderHome();
    else if (vistaActual.startsWith('app:')) renderApp(vistaActual.split(':')[1]);
    else if (vistaActual.startsWith('chat:')) renderChat(vistaActual.split(':')[1]);
  }

  function renderPantallaPIN() {
    const tv = Motor.state.casoActual.telefono_victima || {};
    const pista = tv.pista_pin || 'Pista: investiga el contexto para encontrar el PIN.';
    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">📱 ${tv.modelo || 'Teléfono de la víctima'}</h2></div>
      <div class="telefono-marco">
        <div class="telefono-pantalla">
          <div class="telefono-pin">
            <p style="opacity:0.7; font-size:13px;">Ingrese PIN de 4 dígitos</p>
            <input type="password" id="pin-input" maxlength="4" inputmode="numeric" placeholder="••••">
            <button id="btn-pin-submit">Desbloquear</button>
            <p id="pin-hint" style="opacity:0.55; font-size:11px; margin-top:30px; padding:0 20px;">
              💡 ${pista}
            </p>
          </div>
        </div>
      </div>
    `);
    document.getElementById('btn-pin-submit').addEventListener('click', intentarPIN);
    document.getElementById('pin-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') intentarPIN();
    });
  }

  function intentarPIN() {
    const val = document.getElementById('pin-input').value;
    const correcto = Motor.state.casoActual.telefono_victima.pin;
    if (val === correcto) {
      Motor.state.telefonoDesbloqueado = true;
      Motor.guardar();
      Motor.actualizarBadges();
      Motor.toast('Teléfono desbloqueado');
      render();
    } else {
      Motor.toast('PIN incorrecto');
      document.getElementById('pin-input').value = '';
    }
  }

  function renderHome() {
    const apps = Motor.state.casoActual.telefono_victima.apps;
    const items = Object.entries(apps).map(([key, app]) => `
      <div class="app-icon" data-app="${key}">
        <div class="app-icon-emoji">${app.icono}</div>
        <div class="app-icon-nombre">${app.nombre}</div>
      </div>
    `).join('');
    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">📱 Teléfono — Renata</h2></div>
      <div class="telefono-marco">
        <div class="telefono-pantalla">
          <div class="telefono-status-bar"><span>iPhone</span><span>📶 🔋</span></div>
          <div class="apps-grid">${items}</div>
        </div>
      </div>
    `);
    document.querySelectorAll('.app-icon').forEach(el => {
      el.addEventListener('click', () => {
        vistaActual = 'app:' + el.dataset.app;
        renderApp(el.dataset.app);
      });
    });
  }

  function renderApp(appKey) {
    const app = Motor.state.casoActual.telefono_victima.apps[appKey];
    if (!app) { vistaActual = 'home'; renderHome(); return; }

    let contenidoApp = '';
    switch (appKey) {
      case 'whatsapp':  contenidoApp = renderListaChats(app); break;
      case 'galeria':   contenidoApp = renderGaleria(app); break;
      case 'llamadas':  contenidoApp = renderLlamadasRegistro(app); break;
      case 'notas':     contenidoApp = renderNotas(app); break;
      case 'correo':    contenidoApp = renderCorreo(app); break;
      case 'instagram': contenidoApp = renderInstagram(app); break;
    }

    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">📱 ${app.nombre}</h2></div>
      <div class="telefono-marco">
        <div class="telefono-pantalla">
          <div class="telefono-status-bar"><span>${app.nombre}</span><span>📶 🔋</span></div>
          <div class="app-vista">
            <div class="app-vista-header">
              <button class="app-vista-volver" id="btn-app-volver">← Apps</button>
              <span style="font-weight:bold;">${app.nombre}</span>
            </div>
            ${contenidoApp}
          </div>
        </div>
      </div>
    `);

    document.getElementById('btn-app-volver').addEventListener('click', () => {
      vistaActual = 'home';
      renderHome();
    });

    // Listener específicos por app
    if (appKey === 'whatsapp') {
      document.querySelectorAll('.wa-lista-chat').forEach(el => {
        el.addEventListener('click', () => {
          const chatId = el.dataset.chat;
          vistaActual = 'chat:' + chatId;
          renderChat(chatId);
        });
      });
    }
    if (appKey === 'galeria') {
      document.querySelectorAll('.galeria-item').forEach(el => {
        el.addEventListener('click', () => {
          const fotoId = el.dataset.foto;
          const f = app.fotos.find(x => x.id === fotoId);
          alert(`📸 ${f.descripcion}\n\n📅 ${f.fecha}\n📍 ${f.ubicacion}`);
          // Foto del estacionamiento → desbloquea evidencia "video_camaras" cuando se nota
          if (fotoId === 'g4') {
            Motor.toast('Nota interesante: el carro de la foto debería verse en cámaras');
          }
        });
      });
    }
  }

  // ---- WhatsApp ----
  function renderListaChats(app) {
    return `<div class="wa-lista-chats">${
      app.chats.map(c => {
        const ultimo = c.mensajes[c.mensajes.length - 1];
        let preview = ultimo.texto || (ultimo.audio ? '🎤 Audio' : '');
        if (ultimo.borrado) preview = '🚫 Mensaje eliminado';
        return `
          <div class="wa-lista-chat" data-chat="${c.id}">
            <div class="wa-lista-chat-nombre">
              <span>${c.nombre}</span>
              <span class="wa-lista-chat-hora">${c.ultima_hora}</span>
            </div>
            <div class="wa-lista-chat-preview">${preview}</div>
          </div>
        `;
      }).join('')
    }</div>`;
  }

  function renderChat(chatId) {
    const app = Motor.state.casoActual.telefono_victima.apps.whatsapp;
    const chat = app.chats.find(c => c.id === chatId);
    if (!chat) return;

    const mensajesHTML = chat.mensajes.map((m, i) => {
      const esSaliente = m.de === 'renata';
      const recuperado = Motor.state.chatsBorradosRecuperados.includes(`${chatId}-${i}`);

      if (m.borrado && !recuperado) {
        return `
          <div class="wa-mensaje ${esSaliente ? 'saliente' : 'entrante'} wa-mensaje-borrado">
            🚫 Mensaje eliminado
            <button class="btn-recuperar" data-chat="${chatId}" data-idx="${i}">🔍 Intentar recuperar</button>
          </div>
        `;
      }
      if (m.borrado && recuperado) {
        return `
          <div class="wa-mensaje ${esSaliente ? 'saliente' : 'entrante'}" style="border:2px solid #d4a574;">
            ${m.texto_real}
            <div class="wa-mensaje-hora">${m.hora} (recuperado)</div>
          </div>
        `;
      }
      if (m.audio) {
        return `
          <div class="wa-mensaje ${esSaliente ? 'saliente' : 'entrante'} wa-mensaje-audio">
            <button data-audio="${chatId}-${i}">▶ Reproducir audio (${m.duracion})</button>
            <div class="wa-mensaje-audio-transcripcion" id="transcripcion-${chatId}-${i}" style="display:none;">
              "${m.transcripcion}"
            </div>
            <div class="wa-mensaje-hora">${m.hora}</div>
          </div>
        `;
      }
      return `
        <div class="wa-mensaje ${esSaliente ? 'saliente' : 'entrante'}">
          ${m.texto}
          <div class="wa-mensaje-hora">${m.hora}</div>
        </div>
      `;
    }).join('');

    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">💬 ${chat.nombre}</h2></div>
      <div class="telefono-marco">
        <div class="telefono-pantalla">
          <div class="telefono-status-bar"><span>WhatsApp</span><span>📶 🔋</span></div>
          <div class="app-vista">
            <div class="app-vista-header">
              <button class="app-vista-volver" id="btn-chat-volver">← Chats</button>
              <span style="font-weight:bold;">${chat.nombre}</span>
            </div>
            <div class="wa-chat-conversacion">${mensajesHTML}</div>
          </div>
        </div>
      </div>
    `);

    document.getElementById('btn-chat-volver').addEventListener('click', () => {
      vistaActual = 'app:whatsapp';
      renderApp('whatsapp');
    });

    document.querySelectorAll('.btn-recuperar').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.chat;
        const idx = parseInt(btn.dataset.idx);
        Motor.state.chatsBorradosRecuperados.push(`${cid}-${idx}`);
        Motor.guardar();
        Motor.toast('Mensaje recuperado del cache');
        // Si es el msg borrado de Paulina → desbloquea evidencia
        if (cid === 'paulina') {
          Motor.agregarEvidencia('msg_borrado_paulina');
        }
        renderChat(cid);
      });
    });

    document.querySelectorAll('[data-audio]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.audio;
        const tr = document.getElementById('transcripcion-' + id);
        tr.style.display = 'block';
        btn.textContent = '✓ Reproducido';
        // Audio de Roberto disculpándose
        if (id.startsWith('roberto')) {
          Motor.agregarEvidencia('audio_disculpa');
        }
      });
    });

    // Si abre el chat con Mateo → desbloquea evidencia (motivo del crimen)
    if (chatId === 'mateo') {
      Motor.agregarEvidencia('chat_mateo');
    }
    // Si abre el chat con Diego → desbloquea evidencia
    if (chatId === 'diego') {
      Motor.agregarEvidencia('msg_amenaza_diego');
    }
    Motor.avanzarPaso();
  }

  // ---- Galería ----
  function renderGaleria(app) {
    return `<div class="galeria-grid">${
      app.fotos.map(f => `
        <div class="galeria-item" data-foto="${f.id}">
          <div class="galeria-item-thumbnail">${f.descripcion}</div>
          <div class="galeria-item-fecha">${f.fecha}</div>
        </div>
      `).join('')
    }</div>`;
  }

  // ---- Llamadas (registro) ----
  function renderLlamadasRegistro(app) {
    return app.registro.map(r => `
      <div class="lista-item">
        <div class="lista-item-titulo">${r.contacto}</div>
        <div class="lista-item-fecha">${r.tipo} · ${r.fecha} · ${r.duracion}</div>
      </div>
    `).join('');
  }

  // ---- Notas ----
  function renderNotas(app) {
    return app.lista.map(n => `
      <div class="lista-item">
        <div class="lista-item-titulo">${n.titulo}</div>
        <div class="lista-item-fecha">${n.fecha}</div>
        <div class="lista-item-preview" style="white-space:pre-wrap; opacity:1; margin-top:8px;">${n.texto}</div>
      </div>
    `).join('');
  }

  // ---- Correo ----
  function renderCorreo(app) {
    return app.lista.map(c => `
      <div class="lista-item">
        <div class="lista-item-titulo">${c.asunto}</div>
        <div class="lista-item-fecha">De: ${c.de} · ${c.fecha}</div>
        <div class="lista-item-preview">${c.preview}</div>
      </div>
    `).join('');
  }

  // ---- Instagram ----
  function renderInstagram(app) {
    return `
      <p style="font-weight:bold; margin-bottom:10px;">${app.perfil}</p>
      <h4 style="font-size:12px; opacity:0.7; margin:15px 0 8px;">ÚLTIMAS STORIES</h4>
      ${app.ultimas_stories.map(s => `
        <div class="lista-item">
          <div class="lista-item-fecha">${s.fecha}</div>
          <div class="lista-item-preview">${s.descripcion}</div>
        </div>
      `).join('')}
      <h4 style="font-size:12px; opacity:0.7; margin:20px 0 8px;">DMs DESTACADOS</h4>
      ${app.dms_destacados.map(d => `
        <div class="lista-item">
          <div class="lista-item-titulo">${d.de}</div>
          <div class="lista-item-fecha">${d.fecha}${d.nota ? ' · ' + d.nota : ''}</div>
          <div class="lista-item-preview">"${d.texto}"</div>
        </div>
      `).join('')}
    `;
  }

  return { abrir, render };

})();
