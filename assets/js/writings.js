(function () {
  'use strict';

  // Writings list: loads writings/list.json (falling back to the GitHub API)
  // and filters by search input.
  var container = document.getElementById('writingsList');
  var empty = document.getElementById('writingsEmpty');
  var countEl = document.querySelector('.page-header .sub');
  var searchInput = document.getElementById('searchInput');
  var data = [];
  var currentQuery = '';

  function titleFromName(name) {
    return name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function render() {
    var q = currentQuery.toLowerCase().trim();
    var filtered = data.filter(function (w) {
      if (!q) return true;
      return w.title.toLowerCase().includes(q);
    });

    if (countEl) countEl.textContent = filtered.length + ' writing' + (filtered.length !== 1 ? 's' : '');

    if (filtered.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    container.innerHTML = filtered.map(function (w) {
      return '<div class="writing-item">'
        + '<div class="writing-title"><a href="/writings/' + w.file + '" target="_blank">' + w.title + '</a></div>'
        + '<a class="writing-link" href="/writings/' + w.file + '" target="_blank">open PDF</a>'
        + '</div>';
    }).join('');
  }

  searchInput.addEventListener('input', function () {
    currentQuery = this.value;
    render();
  });

  function fromAPI() {
    fetch('https://api.github.com/repos/vajradevam/vajradevam.github.io/contents/writings')
      .then(function (r) { return r.json(); })
      .then(function (files) {
        data = [];
        (files || []).forEach(function (f) {
          if (f.name.endsWith('.pdf') && f.type === 'file') {
            data.push({ file: f.name, title: titleFromName(f.name) });
          }
        });
        if (data.length === 0) throw new Error('no pdfs');
        render();
      })
      .catch(function () {});
  }

  fetch('/writings/list.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.length > 0) {
        data = d.map(function (e) {
          if (typeof e === 'string') return { file: e, title: titleFromName(e) };
          return e;
        });
        render();
      } else {
        fromAPI();
      }
    })
    .catch(function () { fromAPI(); });
})();
