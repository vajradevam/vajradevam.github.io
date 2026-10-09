/* Research page: filter publications by status. */
(function () {
  var sel = document.getElementById('statusFilter') as HTMLSelectElement | null;
  var list = document.getElementById('refList');
  var empty = document.getElementById('refEmpty');
  if (!sel || !list) return;
  sel.addEventListener('change', function () {
    var q = sel.value;
    var visible = 0;
    list.querySelectorAll(':scope > li').forEach(function (li) {
      var match = !q || li.getAttribute('data-status') === q;
      (li as HTMLElement).style.display = match ? '' : 'none';
      if (match) visible++;
    });
    if (empty) (empty as HTMLElement).style.display = visible ? 'none' : 'block';
  });
})();
