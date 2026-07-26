(function () {
  'use strict';

  var canvas, ctx;
  var particles = [];
  var mouseX = 0, mouseY = 0;
  var isMouseDown = false;
  var animationId = null;
  var dpr = window.devicePixelRatio || 1;

  var colors = [
    '#ffd700',
    '#1e90ff',
    '#ff4500',
    '#228b22',
    '#ffffff'
  ];

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'mouse-trails-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '99999';
    canvas.style.pointerEvents = 'none';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.background = 'transparent';
    canvas.style.border = 'none';
    canvas.style.boxShadow = 'none';
    canvas.style.maxWidth = 'none';
    document.body.appendChild(canvas);

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    startAnimation();
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (isMouseDown) {
      for (var i = 0; i < 2; i++) {
        createParticle(mouseX, mouseY);
      }
    } else {
      createParticle(mouseX, mouseY);
    }
  }

  function onMouseDown(e) {
    isMouseDown = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
    for (var i = 0; i < 5; i++) {
      createParticle(mouseX, mouseY);
    }
  }

  function onMouseUp() {
    isMouseDown = false;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      createParticle(mouseX, mouseY);
    }
  }

  function createParticle(x, y) {
    if (particles.length > 100) {
      particles.shift();
    }
    var color = colors[Math.floor(Math.random() * colors.length)];
    var size = Math.random() * 4 + 2;
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: size,
      color: color,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015
    });
  }

  function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x - p.size / 2), Math.floor(p.y - p.size / 2), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function animate() {
    updateParticles();
    drawParticles();
    animationId = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (animationId) return;
    animate();
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function destroy() {
    stopAnimation();
    window.removeEventListener('resize', resize);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onTouchMove);
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
    ctx = null;
    particles = [];
  }

  window.MouseTrails = {
    init: init,
    start: startAnimation,
    stop: stopAnimation,
    destroy: destroy
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();