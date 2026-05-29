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
    var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 44;

    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var isLight = document.documentElement.classList.contains('light');

    // --- Particle layers ---
    var layers = [
      { count: 140, radius: [22, 44], size: 0.11, opacity: 0.3 },
      { count: 70, radius: [8, 18], size: 0.07, opacity: 0.2 },
    ];

    var particleSystems = [];

    layers.forEach(function(layer) {
      var count = layer.count;
      var pos = new Float32Array(count * 3);
      for (var i = 0; i < count; i++) {
        var r = layer.radius[0] + Math.random() * (layer.radius[1] - layer.radius[0]);
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos(2 * Math.random() - 1);
        pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i*3+2] = r * Math.cos(phi);
      }

      var pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var pMat = new THREE.PointsMaterial({
        color: isLight ? 0x5e81ac : 0x81a1c1,
        size: layer.size,
        transparent: true,
        opacity: layer.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      var particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);
      particleSystems.push(particles);
    });

    // --- Connection lines (outer layer) ---
    var outerPos = particleSystems[0].geometry.attributes.position.array;
    var count = layers[0].count;
    var lpos = [];
    var threshold = 80;

    for (var i = 0; i < count; i++) {
      for (var j = i + 1; j < count; j++) {
        var dx = outerPos[i*3] - outerPos[j*3];
        var dy = outerPos[i*3+1] - outerPos[j*3+1];
        var dz = outerPos[i*3+2] - outerPos[j*3+2];
        var dist = dx*dx + dy*dy + dz*dz;
        if (dist < threshold && Math.random() < 0.18) {
          lpos.push(outerPos[i*3], outerPos[i*3+1], outerPos[i*3+2]);
          lpos.push(outerPos[j*3], outerPos[j*3+1], outerPos[j*3+2]);
        }
      }
    }

    var lines;
    if (lpos.length > 0) {
      var lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
      var lMat = new THREE.LineBasicMaterial({
        color: isLight ? 0x5e81ac : 0x81a1c1,
        transparent: true,
        opacity: 0.035,
      });
      lines = new THREE.LineSegments(lGeo, lMat);
      scene.add(lines);
    }

    // --- Mouse parallax ---
    var mx = 0, my = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', function(e) {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // --- Animation ---
    function animate() {
      requestAnimationFrame(animate);
      tx += (mx - tx) * 0.008;
      ty += (my - ty) * 0.008;

      particleSystems[0].rotation.y += 0.00015;
      particleSystems[0].rotation.x += 0.00004;
      if (particleSystems[1]) {
        particleSystems[1].rotation.y -= 0.0001;
        particleSystems[1].rotation.x += 0.00002;
      }
      if (lines) {
        lines.rotation.y += 0.00015;
        lines.rotation.x += 0.00004;
      }

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
      var color = light ? 0x5e81ac : 0x81a1c1;
      particleSystems.forEach(function(ps) {
        ps.material.color.setHex(color);
      });
      if (lines) lines.material.color.setHex(color);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
})();
