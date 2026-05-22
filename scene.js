(function() {
  if (!document.getElementById('bg-canvas')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    var cdn = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    var script = document.createElement('script');
    script.src = cdn;
    script.onload = init;
    document.head.appendChild(script);
  } catch(e) {}

  function init() {
    var container = document.getElementById('bg-canvas');
    if (!container || !THREE) return;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 38;

    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var isLight = document.documentElement.classList.contains('light');

    // --- Particles ---
    var count = 200;
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var r = 12 + Math.random() * 28;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }

    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pMat = new THREE.PointsMaterial({
      color: isLight ? 0x6366f1 : 0x818cf8,
      size: 0.13,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // --- Connection lines ---
    var lpos = [];
    for (var i = 0; i < count; i++) {
      for (var j = i + 1; j < count; j++) {
        var dx = pos[i*3] - pos[j*3];
        var dy = pos[i*3+1] - pos[j*3+1];
        var dz = pos[i*3+2] - pos[j*3+2];
        if (dx*dx + dy*dy + dz*dz < 64 && Math.random() < 0.25) {
          lpos.push(pos[i*3], pos[i*3+1], pos[i*3+2]);
          lpos.push(pos[j*3], pos[j*3+1], pos[j*3+2]);
        }
      }
    }

    var lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
    var lMat = new THREE.LineBasicMaterial({
      color: isLight ? 0x6366f1 : 0x818cf8,
      transparent: true,
      opacity: 0.06,
    });
    var lines = new THREE.LineSegments(lGeo, lMat);
    scene.add(lines);


    // --- Mouse parallax ---
    var mx = 0, my = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', function(e) {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // --- Animation ---
    function animate() {
      requestAnimationFrame(animate);
      tx += (mx - tx) * 0.015;
      ty += (my - ty) * 0.015;

      particles.rotation.y += 0.0003;
      lines.rotation.y += 0.0003;

      renderer.render(scene, camera);
    }
    animate();

    // --- Resize ---
    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Theme sync ---
    var obs = new MutationObserver(function() {
      var light = document.documentElement.classList.contains('light');
      var pc = light ? 0x6366f1 : 0x818cf8;
      pMat.color.setHex(pc);
      lMat.color.setHex(pc);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
})();
