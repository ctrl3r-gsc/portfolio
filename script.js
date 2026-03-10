const gradientCanvas = document.getElementById('bg-gradient');
const gradientCtx = gradientCanvas.getContext('2d');
const heroCanvas = document.getElementById('webgl-hero');
const cursor = document.querySelector('.cursor');
const sections = [...document.querySelectorAll('[data-parallax]')];

let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let scrollY = window.scrollY;

function resize2DCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  gradientCanvas.width = Math.floor(window.innerWidth * ratio);
  gradientCanvas.height = Math.floor(window.innerHeight * ratio);
  gradientCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function renderGradient(time) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  gradientCtx.clearRect(0, 0, w, h);

  const g1 = gradientCtx.createRadialGradient(
    w * (0.32 + Math.sin(time * 0.0003) * 0.06),
    h * (0.28 + Math.cos(time * 0.00025) * 0.08),
    20,
    w * 0.34,
    h * 0.34,
    w * 0.8
  );
  g1.addColorStop(0, 'rgba(0,224,255,0.2)');
  g1.addColorStop(1, 'rgba(0,224,255,0)');

  const g2 = gradientCtx.createRadialGradient(
    w * (0.73 + Math.cos(time * 0.0002) * 0.05),
    h * (0.75 + Math.sin(time * 0.00035) * 0.05),
    10,
    w * 0.72,
    h * 0.7,
    w * 0.7
  );
  g2.addColorStop(0, 'rgba(95, 140, 255, 0.14)');
  g2.addColorStop(1, 'rgba(95, 140, 255, 0)');

  gradientCtx.fillStyle = '#0a0a0a';
  gradientCtx.fillRect(0, 0, w, h);
  gradientCtx.fillStyle = g1;
  gradientCtx.fillRect(0, 0, w, h);
  gradientCtx.fillStyle = g2;
  gradientCtx.fillRect(0, 0, w, h);
}

function initWebGLHero() {
  const gl = heroCanvas.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) return null;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `);
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec2 uResolution;

    void main() {
      vec2 uv = vUv;
      vec2 m = uMouse / uResolution;
      float wave = sin((uv.x * 9.0) + uTime * 0.8) * 0.03 + cos((uv.y * 8.0) + uTime * 0.7) * 0.03;
      float dist = distance(uv + wave, m);
      float glow = 0.02 / (dist + 0.02);
      vec3 base = vec3(0.02, 0.04, 0.08);
      vec3 accent = vec3(0.0, 0.88, 1.0) * glow;
      float grid = smoothstep(0.98, 1.0, sin(uv.x * 90.0) * sin(uv.y * 90.0));
      gl_FragColor = vec4(base + accent + grid * 0.04, 0.9);
    }
  `);
  gl.compileShader(fragmentShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const timeLoc = gl.getUniformLocation(program, 'uTime');
  const mouseLoc = gl.getUniformLocation(program, 'uMouse');
  const resolutionLoc = gl.getUniformLocation(program, 'uResolution');

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = heroCanvas.clientWidth || heroCanvas.parentElement.clientWidth;
    const h = heroCanvas.clientHeight || heroCanvas.parentElement.clientHeight;
    heroCanvas.width = Math.floor(w * ratio);
    heroCanvas.height = Math.floor(h * ratio);
    gl.viewport(0, 0, heroCanvas.width, heroCanvas.height);
    gl.uniform2f(resolutionLoc, heroCanvas.width, heroCanvas.height);
  };

  return { gl, timeLoc, mouseLoc, resize };
}

const webgl = initWebGLHero();

function render(time) {
  renderGradient(time);

  if (webgl) {
    webgl.gl.uniform1f(webgl.timeLoc, time * 0.001);
    webgl.gl.uniform2f(webgl.mouseLoc, pointerX, window.innerHeight - pointerY);
    webgl.gl.drawArrays(webgl.gl.TRIANGLE_STRIP, 0, 4);
  }

  sections.forEach((section) => {
    const speed = Number(section.dataset.parallax || 0);
    const rect = section.getBoundingClientRect();
    const offset = (scrollY - (rect.top + scrollY - window.innerHeight * 0.5)) * speed * 0.08;
    section.style.setProperty('--parallax-y', `${offset}px`);
  });

  requestAnimationFrame(render);
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

window.addEventListener('mousemove', (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
  cursor.style.left = `${pointerX}px`;
  cursor.style.top = `${pointerY}px`;
});

window.addEventListener('mousedown', () => cursor.classList.add('active'));
window.addEventListener('mouseup', () => cursor.classList.remove('active'));

window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
window.addEventListener('resize', () => {
  resize2DCanvas();
  webgl?.resize();
});

resize2DCanvas();
webgl?.resize();
requestAnimationFrame(render);
