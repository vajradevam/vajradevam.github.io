/* Post enhancements: TOC scroll-spy, copy buttons, heading § anchors visible on focus. */
(function () {
  // Scroll-spy
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('#toc a[data-target]'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = new Map();
    tocLinks.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('data-target'));
      if (el) map.set(el, a);
    });
    var current = null;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          if (current) current.removeAttribute('aria-current');
          var a = map.get(e.target);
          if (a) { a.setAttribute('aria-current', 'true'); current = a; }
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    map.forEach(function (_, el) { obs.observe(el); });
  }

  // Copy buttons on code blocks
  document.querySelectorAll('.prose pre').forEach(function (pre) {
    if (pre.parentElement && pre.parentElement.classList.contains('code-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'copy';
    btn.setAttribute('aria-label', 'Copy code block');
    btn.addEventListener('click', function () {
      var text = pre.innerText;
      var done = function () {
        btn.textContent = 'copied';
        setTimeout(function () { btn.textContent = 'copy'; }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove();
        done();
      }
    });
    wrap.appendChild(btn);
  });
})();
