(function() {
  'use strict';

  // --- Page transition: fade in on load ---
  document.body.classList.add('page-fade');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      document.body.classList.add('page-fade-in');
    });
  });

  // --- Page transition: fade out on nav click ---
  var navLinks = document.querySelectorAll('nav a:not(.brand)');
  navLinks.forEach(function(a) {
    a.addEventListener('click', function(e) {
      if (a.hostname === location.hostname && a.pathname !== location.pathname) {
        e.preventDefault();
        document.body.classList.remove('page-fade-in');
        var target = a.href;
        setTimeout(function() { location.href = target; }, 350);
      }
    });
  });

  // --- Mobile nav toggle ---
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function() {
      links.classList.toggle('open');
    });
    // Close nav on link click
    links.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        links.classList.remove('open');
      });
    });
  }

  // --- Scroll reveal ---
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function(el) { observer.observe(el); });
  } else {
    revealEls.forEach(function(el) { el.classList.add('revealed'); });
  }

  // --- Typewriter effect ---
  var tw = document.querySelector('.typewriter');
  if (tw) {
    var text = tw.textContent;
    tw.textContent = '';
    var cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    tw.appendChild(cursor);

    var i = 0;
    var interval = setInterval(function() {
      if (i < text.length) {
        tw.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
      } else {
        clearInterval(interval);
        // Keep cursor blinking after typing
      }
    }, 28);
  }
})();
