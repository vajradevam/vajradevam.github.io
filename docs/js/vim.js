/* vajradevam.in — statusline + vim motions. No dependencies. */
(function () {
  'use strict';

  var pct = document.getElementById('sl-pct');
  var lncol = document.getElementById('sl-lncol');
  var mode = document.getElementById('sl-mode');
  var LINE = 26.25; // 15px * 1.75 line-height

  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var y = window.scrollY;
    var p;
    if (max <= 0) p = 'All';
    else if (y <= 0) p = 'Top';
    else if (y >= max - 2) p = 'Bot';
    else p = Math.round((y / max) * 100) + '%';
    if (pct) pct.textContent = p;
    if (lncol) lncol.textContent = (Math.floor(y / LINE) + 1) + ':1';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();

  /* VISUAL mode while text is selected */
  document.addEventListener('selectionchange', function () {
    if (!mode) return;
    var sel = window.getSelection();
    var visual = sel && sel.toString().length > 0;
    mode.textContent = visual ? 'VISUAL' : 'NORMAL';
    mode.classList.toggle('visual', visual);
  });

  /* vim motions */
  var tabs = ['/', '/about/', '/research/', '/projects/', '/blog/', '/writings/'];
  function tabIndex() {
    var p = location.pathname;
    var best = 0;
    for (var i = 0; i < tabs.length; i++) {
      if (p === tabs[i]) return i;
      if (tabs[i] !== '/' && p.indexOf(tabs[i]) === 0) best = i;
    }
    return best;
  }

  var help = document.getElementById('keyhelp');
  var pending = ''; // for gg / gt / gT

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    var k = e.key;

    if (pending === 'g') {
      pending = '';
      if (k === 'g') { window.scrollTo({ top: 0 }); e.preventDefault(); return; }
      if (k === 't') { location.href = tabs[(tabIndex() + 1) % tabs.length]; return; }
      if (k === 'T') { location.href = tabs[(tabIndex() + tabs.length - 1) % tabs.length]; return; }
      return;
    }

    switch (k) {
      case 'j': window.scrollBy({ top: LINE * 3 }); e.preventDefault(); break;
      case 'k': window.scrollBy({ top: -LINE * 3 }); e.preventDefault(); break;
      case 'd': window.scrollBy({ top: window.innerHeight / 2 }); e.preventDefault(); break;
      case 'u': window.scrollBy({ top: -window.innerHeight / 2 }); e.preventDefault(); break;
      case 'G': window.scrollTo({ top: document.documentElement.scrollHeight }); e.preventDefault(); break;
      case 'g': pending = 'g'; break;
      case '?':
        if (help) help.hidden = !help.hidden;
        break;
      case 'Escape':
        if (help) help.hidden = true;
        break;
    }
  });
})();
