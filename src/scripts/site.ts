/* Shared site module: theme toggle, bytes toggle (Shift+B), 0xDEADBEEF easter egg. <3KB gzip. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // Theme
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    var syncTheme = function () {
      themeBtn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false');
    };
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncTheme();
    });
    syncTheme();
  }

  // Bytes toggle: hex dump of the page's visible text
  var bytesBtn = document.getElementById('bytesToggle');
  var status = document.getElementById('bytesStatus');
  var main = document.getElementById('main');
  var hexEl: HTMLElement | null = null;
  var hidden: HTMLElement[] = [];

  function announce(msg: string) { if (status) status.textContent = msg; }

  function bytesOn() {
    if (!main || hexEl) return;
    var text = (main.innerText || '').trim();
    var bytes = new TextEncoder().encode(text);
    var lines: string[] = [];
    for (var off = 0; off < bytes.length; off += 16) {
      var chunk = bytes.slice(off, off + 16);
      var hex: string[] = [];
      var ascii = '';
      for (var i = 0; i < chunk.length; i++) {
        var b = chunk[i];
        hex.push(b.toString(16).padStart(2, '0'));
        ascii += b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
      }
      while (hex.length < 16) hex.push('  ');
      var mid = hex.slice(0, 8).join(' ') + '  ' + hex.slice(8).join(' ');
      lines.push(off.toString(16).padStart(8, '0') + '  ' + mid + '  |' + ascii + '|');
    }
    hidden = Array.prototype.slice.call(main.children) as HTMLElement[];
    hidden.forEach(function (el) { el.setAttribute('hidden', ''); });
    hexEl = document.createElement('pre');
    hexEl.className = 'hexdump';
    hexEl.setAttribute('tabindex', '0');
    hexEl.setAttribute('aria-label', 'Hex dump of this page’s text, ' + bytes.length + ' bytes');
    hexEl.textContent = lines.join('\n');
    main.appendChild(hexEl);
    if (bytesBtn) bytesBtn.setAttribute('aria-pressed', 'true');
    announce('Hex dump on. ' + bytes.length + ' bytes. Press Shift B to restore reading view.');
  }

  function bytesOff() {
    if (!main || !hexEl) return;
    hexEl.remove();
    hexEl = null;
    hidden.forEach(function (el) { el.removeAttribute('hidden'); });
    hidden = [];
    if (bytesBtn) bytesBtn.setAttribute('aria-pressed', 'false');
    announce('Reading view restored.');
  }

  function toggleBytes() { (hexEl ? bytesOff : bytesOn)(); }

  if (bytesBtn) bytesBtn.addEventListener('click', toggleBytes);
  document.addEventListener('keydown', function (ev) {
    if (ev.shiftKey && (ev.key === 'B' || ev.key === 'b') && !(ev.target instanceof HTMLInputElement) && !(ev.target instanceof HTMLTextAreaElement)) {
      ev.preventDefault();
      toggleBytes();
    }
  });

  // Easter egg: typing 0xDEADBEEF flashes the nav word
  var seq = '';
  document.addEventListener('keydown', function (ev) {
    if (ev.key && ev.key.length === 1) {
      seq = (seq + ev.key.toUpperCase()).slice(-10);
      if (seq === '0XDEADBEEF') {
        var word = document.getElementById('instrWord');
        if (!word) return;
        var bits = word.querySelectorAll('.f-bits');
        var orig: string[] = [];
        bits.forEach(function (el, i) {
          orig[i] = el.textContent || '';
          el.textContent = ['11011110', '10101101', '10111110', '11101111'][i % 4].slice(0, orig[i].length);
        });
        word.classList.add('flash');
        setTimeout(function () {
          word.classList.remove('flash');
          bits.forEach(function (el, i) { el.textContent = orig[i]; });
        }, 900);
        seq = '';
      }
    }
  });
})();
