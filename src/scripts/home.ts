/* Home: highlight the stack layer matching the section in view (progressive enhancement). */
(function () {
  var layers = Array.prototype.slice.call(document.querySelectorAll('.stack-layer')) as HTMLElement[];
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-layer]')) as HTMLElement[];
  if (!layers.length || !sections.length || !('IntersectionObserver' in window)) return;
  var byDepth = new Map<number, HTMLElement>();
  layers.forEach(function (l) { byDepth.set(Number(l.getAttribute('data-depth')), l); });
  var setLive = function (depth: number) {
    layers.forEach(function (l) { l.classList.remove('is-live'); });
    // "peel": layers above the current depth read as removed — mark current + below as live path
    var el = byDepth.get(depth);
    if (el) el.classList.add('is-live');
  };
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) setLive(Number((e.target as HTMLElement).getAttribute('data-layer')));
    });
  }, { rootMargin: '-40% 0px -40% 0px' });
  sections.forEach(function (s) { obs.observe(s); });
})();
