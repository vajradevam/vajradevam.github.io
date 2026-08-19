(function () {
  'use strict';

  // Blog list search: filters post entries by the data-search attribute
  // (title + description + tags) and hides empty year groups.
  var input = document.getElementById('blogSearch');
  if (!input) return;
  var entries = [].slice.call(document.querySelectorAll('#blogList .post-entry'));
  var groups = [].slice.call(document.querySelectorAll('#blogList .year-group'));
  var empty = document.getElementById('blogEmpty');

  input.addEventListener('input', function () {
    var q = this.value.toLowerCase().trim();
    var anyVisible = false;

    entries.forEach(function (el) {
      var hay = el.getAttribute('data-search') || '';
      var match = !q || hay.indexOf(q) > -1;
      el.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });

    groups.forEach(function (g) {
      var hasVisible = false;
      g.querySelectorAll('.post-entry').forEach(function (e) {
        if (e.style.display !== 'none') hasVisible = true;
      });
      g.style.display = hasVisible ? '' : 'none';
    });

    if (empty) empty.style.display = anyVisible ? 'none' : 'block';
  });
})();
