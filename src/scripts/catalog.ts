/* Component catalog: tabs, search/filter/sort. Works unfiltered with JS disabled. */
(function () {
  var tabTable = document.getElementById('tabTable');
  var tabLayer = document.getElementById('tabLayer');
  var tableView = document.getElementById('tableView');
  var layerView = document.getElementById('layerView');
  if (tabTable && tabLayer && tableView && layerView) {
    var show = function (table: boolean) {
      tabTable.setAttribute('aria-selected', String(table));
      tabLayer.setAttribute('aria-selected', String(!table));
      tableView.hidden = !table;
      layerView.hidden = table;
    };
    tabTable.addEventListener('click', function () { show(true); });
    tabLayer.addEventListener('click', function () { show(false); });
  }

  var q = document.getElementById('q') as HTMLInputElement | null;
  var fLang = document.getElementById('fLang') as HTMLSelectElement | null;
  var fCat = document.getElementById('fCat') as HTMLSelectElement | null;
  var fSort = document.getElementById('fSort') as HTMLSelectElement | null;
  var body = document.getElementById('catalogBody');
  var empty = document.getElementById('catalogEmpty');
  var count = document.getElementById('partCount');
  if (!q || !fLang || !fCat || !fSort || !body) return;
  var rows = Array.prototype.slice.call(body.querySelectorAll('tr'));

  function render() {
    var query = q.value.toLowerCase().trim();
    var lang = fLang.value;
    var cat = fCat.value;
    var visible = rows.filter(function (r: HTMLElement) {
      var ok =
        (!query || r.dataset.name.indexOf(query) > -1 || r.dataset.desc.indexOf(query) > -1) &&
        (!lang || r.dataset.lang === lang) &&
        (!cat || r.dataset.cat === cat);
      r.style.display = ok ? '' : 'none';
      return ok;
    });
    var key = fSort.value;
    visible
      .sort(function (a: HTMLElement, b: HTMLElement) {
        var av = key === 'name' ? a.dataset.name : key === 'lang' ? (a.dataset.lang + a.dataset.name) : a.dataset.ref;
        var bv = key === 'name' ? b.dataset.name : key === 'lang' ? (b.dataset.lang + b.dataset.name) : b.dataset.ref;
        return av < bv ? -1 : av > bv ? 1 : 0;
      })
      .forEach(function (r) { body.appendChild(r); });
    if (count) count.textContent = visible.length + ' / ' + rows.length + ' parts';
    if (empty) (empty as HTMLElement).style.display = visible.length ? 'none' : 'block';
  }
  [q, fLang, fCat, fSort].forEach(function (el) {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });
})();
