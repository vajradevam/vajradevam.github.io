/* Blog index: search + tag filter over the static JSON index. */
(function () {
  var input = document.getElementById('blogSearch') as HTMLInputElement | null;
  var tagSel = document.getElementById('tagFilter') as HTMLSelectElement | null;
  var list = document.getElementById('blogList');
  var empty = document.getElementById('blogEmpty');
  var count = document.getElementById('postCount');
  var idxEl = document.getElementById('post-index');
  if (!input || !tagSel || !list || !idxEl) return;
  var index: { id: string; hay: string; tags: string[] }[] = JSON.parse(idxEl.textContent || '[]');
  var entries = Array.prototype.slice.call(list.querySelectorAll('.entry')) as HTMLElement[];
  var sections = Array.prototype.slice.call(list.querySelectorAll('[data-year]')) as HTMLElement[];

  function render() {
    var q = input.value.toLowerCase().trim();
    var tag = tagSel.value;
    var match = new Set<string>();
    index.forEach(function (p) {
      if ((!q || p.hay.indexOf(q) > -1) && (!tag || p.tags.indexOf(tag) > -1)) match.add(p.id);
    });
    entries.forEach(function (el) {
      el.style.display = match.has(el.getAttribute('data-id') || '') ? '' : 'none';
    });
    sections.forEach(function (s) {
      var any = Array.prototype.some.call(s.querySelectorAll('.entry'), function (e: HTMLElement) {
        return e.style.display !== 'none';
      });
      (s as HTMLElement).style.display = any ? '' : 'none';
    });
    if (count) count.textContent = match.size + ' / ' + index.length + ' entries';
    if (empty) (empty as HTMLElement).style.display = match.size ? 'none' : 'block';
  }
  input.addEventListener('input', render);
  tagSel.addEventListener('change', render);
})();
