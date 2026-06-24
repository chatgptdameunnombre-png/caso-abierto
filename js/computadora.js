/* ============================================================
   computadora.js — Laptop de la víctima (apps escritorio)
   ============================================================ */

const Computadora = (() => {

  function abrir() {
    if (!Motor.state.casoActual.computadora_padre) {
      Motor.toast('No hay computadora en este caso');
      return;
    }
    if (!Motor.state.computadoraDesbloqueada) {
      renderPassword();
    } else {
      renderHome();
    }
  }

  function renderPassword() {
    const pc = Motor.state.casoActual.computadora_padre;
    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">💻 ${pc.modelo}</h2></div>
      <div class="laptop-marco">
        <div class="laptop-pantalla">
          <div class="laptop-login">
            <div style="font-size:48px; margin-bottom:15px;">💻</div>
            <p style="opacity:0.8; margin-bottom:20px;">Login required</p>
            <input type="password" id="pc-password-input" placeholder="Password" style="padding:12px 16px; font-size:14px; background:#222; color:#fff; border:1px solid #555; width:260px; text-align:center;">
            <br><br>
            <button class="btn-principal" id="btn-pc-login" style="padding:10px 30px;">Iniciar sesión</button>
            <p style="opacity:0.5; font-size:11px; margin-top:30px;">Pista: revise las notas del teléfono de la víctima.</p>
          </div>
        </div>
      </div>
    `);
    document.getElementById('btn-pc-login').addEventListener('click', intentar);
    document.getElementById('pc-password-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') intentar();
    });
  }

  function intentar() {
    const val = document.getElementById('pc-password-input').value;
    const correcto = Motor.state.casoActual.computadora_padre.password;
    if (val === correcto) {
      Motor.state.computadoraDesbloqueada = true;
      Motor.guardar();
      Motor.actualizarBadges();
      Motor.toast('Computadora desbloqueada');
      renderHome();
    } else {
      Motor.toast('Password incorrecta');
      document.getElementById('pc-password-input').value = '';
    }
  }

  function renderHome() {
    const pc = Motor.state.casoActual.computadora_padre;
    const apps = Object.entries(pc.apps).map(([k, a]) => `
      <div class="pc-app-icon" data-pc-app="${k}">
        <div class="pc-app-icon-emoji">${a.icono}</div>
        <div class="pc-app-icon-nombre">${a.nombre}</div>
      </div>
    `).join('');
    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">💻 Escritorio</h2></div>
      <div class="laptop-marco">
        <div class="laptop-pantalla">
          <div class="pc-apps-grid">${apps}</div>
        </div>
      </div>
    `);
    document.querySelectorAll('[data-pc-app]').forEach(el => {
      el.addEventListener('click', () => renderApp(el.dataset.pcApp));
    });
  }

  function renderApp(appKey) {
    const pc = Motor.state.casoActual.computadora_padre;
    const app = pc.apps[appKey];
    if (!app) return;

    let contenido = '';
    if (app.lista) {
      contenido = app.lista.map(item => `
        <div class="lista-item">
          <div class="lista-item-titulo">${item.asunto || item.titulo || ''}</div>
          <div class="lista-item-fecha">${item.de ? 'De: ' + item.de + ' · ' : ''}${item.fecha || ''}</div>
          <div class="lista-item-preview">${item.preview || item.texto || ''}</div>
        </div>
      `).join('');
    }
    if (app.carpetas) {
      contenido = app.carpetas.map(c => `
        <div class="lista-item">
          <div class="lista-item-titulo">📂 ${c.nombre}</div>
          <ul style="margin-top:8px; padding-left:20px;">
            ${c.archivos.map(a => `<li style="font-size:12px; opacity:0.9; margin:3px 0;">${a}</li>`).join('')}
          </ul>
        </div>
      `).join('');
      // Carpeta EVIDENCIA-BRAD desbloquea evidencia
      if (app.carpetas.some(c => c.nombre.includes('EVIDENCIA'))) {
        Motor.agregarEvidencia('drive_evidencia');
      }
    }
    if (app.busquedas_recientes) {
      contenido = `<p style="opacity:0.7; font-size:12px; margin-bottom:10px;">Búsquedas recientes en Chrome:</p>` +
        app.busquedas_recientes.map(b => `
          <div class="lista-item">
            <div class="lista-item-titulo">🔍 "${b}"</div>
          </div>
        `).join('');
    }
    if (app.mensajes) {
      contenido = app.mensajes.map(m => `
        <div class="lista-item">
          <div class="lista-item-titulo">${m.de}</div>
          <div class="lista-item-fecha">${m.fecha}</div>
          <div class="lista-item-preview">${m.texto}</div>
        </div>
      `).join('');
    }

    Motor.abrirModal(`
      <div class="modal-header"><h2 class="modal-titulo">💻 ${app.nombre}</h2></div>
      <div class="laptop-marco">
        <div class="laptop-pantalla">
          <div class="app-vista-header">
            <button class="app-vista-volver" id="btn-pc-volver">← Apps</button>
            <span style="font-weight:bold;">${app.nombre}</span>
          </div>
          <div style="padding:10px;">${contenido}</div>
        </div>
      </div>
    `);
    document.getElementById('btn-pc-volver').addEventListener('click', renderHome);
    Motor.avanzarPaso();
  }

  return { abrir };

})();
