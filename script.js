/**
 * Mitarth Rai — Portfolio Script
 * Interactive 3D Render Viewport, ScrollSpy, & UI Interactivity
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroViewport();
  initNavigation();
  initScrollSpy();
  initPlaceholders();
  initScrollAnimations();
});

/* ==========================================================================
   01. INTERACTIVE 3D GRAPHICS ENGINE VIEWPORT CANVAS
   ========================================================================== */

function initHeroViewport() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Resize canvas to match display container
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Render State
  let mode = 'wireframe'; // 'wireframe' | 'vertices' | 'solid'
  let angleX = 0.4;
  let angleY = 0.6;
  let isDragging = false;
  let previousMouseX = 0;
  let previousMouseY = 0;

  // FPS Tracker
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fps = 60;
  const fpsElement = document.getElementById('fps-counter');
  const modeLabelElement = document.getElementById('wireframe-mode-label');

  // Generate 3D Geodesic / Wireframe Cube Geometry
  const vertices = [];
  const edges = [];
  const faces = [];

  // Create an Icosahedron / Geodesic-like 3D Mesh
  const phi = (1 + Math.sqrt(5)) / 2;
  const scale = 110;

  const rawVerts = [
    [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
    [0, -1,  phi], [0,  1,  phi], [0, -1, -phi], [0,  1, -phi],
    [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1]
  ];

  rawVerts.forEach(v => {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    vertices.push({
      x: (v[0] / len) * scale,
      y: (v[1] / len) * scale,
      z: (v[2] / len) * scale
    });
  });

  // Connect edges between points closer than threshold
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[i].x - vertices[j].x;
      const dy = vertices[i].y - vertices[j].y;
      const dz = vertices[i].z - vertices[j].z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < scale * 1.35) {
        edges.push([i, j]);
      }
    }
  }

  // Construct Triangles for Solid Mode
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      for (let k = j + 1; k < vertices.length; k++) {
        const d1 = dist(vertices[i], vertices[j]);
        const d2 = dist(vertices[j], vertices[k]);
        const d3 = dist(vertices[k], vertices[i]);
        if (d1 < scale * 1.35 && d2 < scale * 1.35 && d3 < scale * 1.35) {
          faces.push([i, j, k]);
        }
      }
    }
  }

  function dist(a, b) {
    return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
  }

  // Mouse Orbit Controls
  const container = canvas.parentElement;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMouseX;
    const deltaY = e.clientY - previousMouseY;

    angleY += deltaX * 0.008;
    angleX += deltaY * 0.008;

    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  // Touch Support
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      previousMouseX = e.touches[0].clientX;
      previousMouseY = e.touches[0].clientY;
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - previousMouseX;
    const deltaY = e.touches[0].clientY - previousMouseY;

    angleY += deltaX * 0.008;
    angleX += deltaY * 0.008;

    previousMouseX = e.touches[0].clientX;
    previousMouseY = e.touches[0].clientY;
  });

  window.addEventListener('touchend', () => { isDragging = false; });

  // Toolbar Controls
  const btnWireframe = document.getElementById('btn-mode-wireframe');
  const btnNodes = document.getElementById('btn-mode-nodes');
  const btnSolid = document.getElementById('btn-mode-solid');
  const btnReset = document.getElementById('btn-reset-cam');

  function setMode(newMode, activeBtn, modeText) {
    mode = newMode;
    [btnWireframe, btnNodes, btnSolid].forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
    if (modeLabelElement) modeLabelElement.textContent = `MODE: ${modeText}`;
  }

  if (btnWireframe) btnWireframe.addEventListener('click', () => setMode('wireframe', btnWireframe, 'WIREFRAME'));
  if (btnNodes) btnNodes.addEventListener('click', () => setMode('vertices', btnNodes, 'VERTICES'));
  if (btnSolid) btnSolid.addEventListener('click', () => setMode('solid', btnSolid, 'SOLID_SHADED'));
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      angleX = 0.4;
      angleY = 0.6;
    });
  }

  // 3D Rendering Loop
  function render(time) {
    // FPS Calculation
    frameCount++;
    if (time - lastFrameTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (time - lastFrameTime));
      if (fpsElement) fpsElement.textContent = `${fps} FPS`;
      frameCount = 0;
      lastFrameTime = time;
    }

    // Auto rotate slowly if user isn't dragging
    if (!isDragging) {
      angleY += 0.004;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw Viewport 3D Grid Floor
    drawGrid(ctx, centerX, centerY + 80 * dpr, angleY, dpr);

    // 3D Matrix Transformations
    const projected = [];
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);

    vertices.forEach(v => {
      // Rotation Y
      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.x * sinY + v.z * cosY;
      let y1 = v.y;

      // Rotation X
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = y1 * sinX + z1 * cosX;
      let x2 = x1;

      // Perspective Projection
      const fov = 400 * dpr;
      const distance = 450;
      const scaleProj = fov / (distance + z2);

      projected.push({
        x: centerX + x2 * scaleProj,
        y: centerY + y2 * scaleProj,
        z: z2,
        scale: scaleProj
      });
    });

    // RENDER MODES
    if (mode === 'solid') {
      // Sort faces back to front
      const sortedFaces = faces.map(f => {
        const avgZ = (projected[f[0]].z + projected[f[1]].z + projected[f[2]].z) / 3;
        return { face: f, z: avgZ };
      }).sort((a, b) => b.z - a.z);

      sortedFaces.forEach(sf => {
        const [i, j, k] = sf.face;
        const p1 = projected[i];
        const p2 = projected[j];
        const p3 = projected[k];

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();

        // Shading based on Z depth & surface tint
        const shade = Math.min(Math.max((sf.z + 100) / 200, 0.1), 0.9);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.1 + shade * 0.35})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 + shade * 0.4})`;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      });
    }

    if (mode === 'wireframe' || mode === 'solid') {
      // Draw Wireframe Edges
      ctx.beginPath();
      edges.forEach(([i, j]) => {
        const p1 = projected[i];
        const p2 = projected[j];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      });
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
    }

    if (mode === 'vertices' || mode === 'wireframe') {
      // Draw Glowing Vertex Points
      projected.forEach(p => {
        const r = (mode === 'vertices' ? 4 : 2.5) * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = mode === 'vertices' ? '#06b6d4' : '#60a5fa';
        ctx.fill();

        if (mode === 'vertices') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
          ctx.fill();
        }
      });
    }

    // Draw Coordinate Axes Gizmo (XYZ) at bottom left
    drawAxesGizmo(ctx, 40 * dpr, height - 40 * dpr, angleX, angleY, dpr);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

// Draw Viewport Grid Floor
function drawGrid(ctx, cx, cy, angleY, dpr) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1 * dpr;
  const gridSize = 14;
  const step = 24 * dpr;

  for (let i = -gridSize; i <= gridSize; i++) {
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(cx - gridSize * step, cy + i * step * 0.3);
    ctx.lineTo(cx + gridSize * step, cy + i * step * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

// Draw XYZ Axes Gizmo
function drawAxesGizmo(ctx, x, y, angleX, angleY, dpr) {
  const len = 22 * dpr;
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);

  const axes = [
    { label: 'X', dx: len, dy: 0, dz: 0, color: '#ef4444' },
    { label: 'Y', dx: 0, dy: -len, dz: 0, color: '#10b981' },
    { label: 'Z', dx: 0, dy: 0, dz: len, color: '#3b82f6' }
  ];

  axes.forEach(axis => {
    // Rotate
    let x1 = axis.dx * cosY - axis.dz * sinY;
    let z1 = axis.dx * sinY + axis.dz * cosY;
    let y1 = axis.dy;

    let y2 = y1 * cosX - z1 * sinX;
    let x2 = x1;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + x2, y + y2);
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    ctx.font = `${9 * dpr}px JetBrains Mono`;
    ctx.fillStyle = axis.color;
    ctx.fillText(axis.label, x + x2 * 1.2, y + y2 * 1.2);
  });
}

/* ==========================================================================
   02. NAVIGATION & MOBILE DRAWER
   ========================================================================== */

function initNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close menu when link is clicked
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }
}

/* ==========================================================================
   03. SCROLL SPY FOR ACTIVE NAVIGATION LINKS
   ========================================================================== */

function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   04. PLACEHOLDER COPY-TO-CLIPBOARD TOOLTIPS
   ========================================================================== */

function initPlaceholders() {
  const placeholderBtns = document.querySelectorAll('.placeholder-btn, .placeholder-card');

  placeholderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tagText = btn.getAttribute('data-copy');
      if (tagText) {
        navigator.clipboard.writeText(tagText).then(() => {
          showToast(`Copied placeholder tag: ${tagText}`);
        }).catch(() => {
          showToast(`Placeholder tag: ${tagText}`);
        });
      }
    });
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* ==========================================================================
   05. SUBTLE SCROLL REVEAL ANIMATIONS
   ========================================================================== */

function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.project-card, .skill-category-card, .learning-card, .timeline-item, .contact-card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}
