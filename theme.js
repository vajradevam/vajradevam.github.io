(function() {
  var btn = document.getElementById('themeToggle');
  var root = document.documentElement.classList;
  if (localStorage.getItem('theme') === 'light') {
    root.add('light');
    if (btn) btn.textContent = '\u2600';
  }
  if (btn) {
    btn.onclick = function() {
      root.toggle('light');
      var isLight = root.contains('light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      btn.textContent = isLight ? '\u2600' : '\u25C1';
    };
  }
})();
