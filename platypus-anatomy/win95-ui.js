(() => {
  const body = document.body;
  const app = document.querySelector('.viewer-card');
  const startMenu = document.querySelector('#win95-start-menu');
  const shortcut = document.querySelector('#win95-shortcut');
  const status = document.querySelector('#win95-status');
  const current = document.querySelector('#win95-current');
  const startButton = document.querySelector('#win95-start');
  const viewNames = { living: 'Living animal', ivory: 'Ivory skeleton', anatomy: 'Anatomy colors' };
  let activeView = new URLSearchParams(location.search).get('view') || 'ivory';
  let statusTimer = 0;

  function say(message, temporary = false) {
    if (status) status.textContent = message;
    if (temporary) {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => say('Ready — drag to orbit, scroll to zoom'), 2600);
    }
  }

  function syncView(view) {
    if (!viewNames[view]) return;
    activeView = view;
    body.classList.toggle('is-anatomy-mode', view === 'anatomy');
    const key = document.querySelector('.scanner-key');
    if (key) key.hidden = view !== 'anatomy';
    if (current) current.textContent = view.toUpperCase();
    document.querySelectorAll('.win95-viewbar [data-state]').forEach(button => {
      const selected = button.dataset.state === view;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-current', String(selected));
    });
    say(`${viewNames[view]} selected`);
  }

  document.querySelectorAll('[data-state]').forEach(button => {
    button.addEventListener('click', () => {
      syncView(button.dataset.state);
      document.querySelectorAll('.win95-menu[open]').forEach(menu => { menu.open = false; });
      if (startMenu) startMenu.hidden = true;
    });
  });
  syncView(activeView);

  function closeMenus(except = null) {
    document.querySelectorAll('.win95-menu[open]').forEach(menu => {
      if (menu !== except) menu.open = false;
    });
  }
  document.querySelectorAll('.win95-menu').forEach(menu => {
    menu.addEventListener('toggle', () => { if (menu.open) closeMenus(menu); });
  });

  function wheelZoom(direction) {
    const canvas = document.querySelector('#model-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true, cancelable: true, deltaY: direction * 180,
      clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
    }));
    say(direction < 0 ? 'Zoom in' : 'Zoom out');
  }

  function doAction(action) {
    if (action === 'minimize' || action === 'close') {
      app.classList.add('is-minimized');
      shortcut.hidden = false;
      if (startMenu) startMenu.hidden = true;
      return;
    }
    if (action === 'restore') {
      app.classList.remove('is-minimized');
      shortcut.hidden = true;
      if (startMenu) startMenu.hidden = true;
      return;
    }
    if (action === 'maximize') {
      app.classList.toggle('is-maximized');
      return;
    }
    if (action === 'reset') document.querySelector('#reset-camera')?.click();
    if (action === 'fullscreen') document.querySelector('#fullscreen')?.click();
    if (action === 'center-scanner') document.querySelector('#scan-center')?.click();
    if (action === 'toggle-key') {
      body.classList.toggle('win95-key-closed');
      say(body.classList.contains('win95-key-closed') ? 'Anatomy palette hidden' : 'Anatomy palette shown', true);
    }
    if (action === 'copy-link') {
      navigator.clipboard?.writeText(location.href)
        .then(() => say('Viewer link copied', true))
        .catch(() => say('Copy the viewer address from your browser bar', true));
    }
    if (action === 'reset') say('Camera reset', true);
    if (action === 'center-scanner') say('Scanner centered', true);
  }

  document.querySelectorAll('[data-window-action]').forEach(button => {
    button.addEventListener('click', () => {
      doAction(button.dataset.windowAction);
      if (button.dataset.windowAction !== 'restore') closeMenus();
    });
  });
  document.querySelectorAll('[data-tool]').forEach(button => {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach(option => {
        const selected = option === button;
        option.classList.toggle('active', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      if (tool === 'zoom-in') wheelZoom(-1);
      else if (tool === 'zoom-out') wheelZoom(1);
      else if (tool === 'reset') doAction('reset');
      else if (tool === 'fullscreen') doAction('fullscreen');
      else if (tool === 'scanner') {
        if (activeView === 'living') document.querySelector('.win95-viewbar [data-state="ivory"]')?.click();
        else doAction('center-scanner');
      } else say('Drag on the specimen to orbit');
    });
  });

  startButton?.addEventListener('click', event => {
    event.stopPropagation();
    startMenu.hidden = !startMenu.hidden;
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.win95-start-menu, #win95-start')) startMenu.hidden = true;
    if (!event.target.closest('.win95-menu')) closeMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeMenus(); startMenu.hidden = true; }
  });

  function updateClock() {
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
    document.querySelector('#win95-clock').textContent = time;
    document.querySelector('#win95-task-clock').textContent = time;
  }
  updateClock();
  setInterval(updateClock, 30000);
})();
