import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const vsSource = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fsSource = `precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

varying vec2 v_texCoord;

vec3 rgb(float r, float g, float b) {
    return vec3(r / 255.0, g / 255.0, b / 255.0);
}

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = v_texCoord;
    
    vec3 deadlyDepths = rgb(17.0, 17.0, 68.0);     // #111144
    vec3 deepSpaceRoyal = rgb(34.0, 51.0, 130.0);  // #223382
    vec3 asterFlowerBlue = rgb(155.0, 172.0, 216.0); // #9BACD8
    vec3 habanero = rgb(249.0, 133.0, 19.0);       // #F98513
    
    float n1 = snoise(uv * 1.5 + u_time * 0.15);
    float n2 = snoise(uv * 2.5 - u_time * 0.1 + n1);
    float n3 = snoise(uv * 1.0 + u_time * 0.05);

    vec2 mouseNorm = u_mouse / u_resolution;
    float distToMouse = length(uv - mouseNorm);
    float mouseEffect = smoothstep(0.4, 0.0, distToMouse) * 0.25;

    vec3 color = deadlyDepths;
    color = mix(color, deepSpaceRoyal, smoothstep(-0.4, 0.6, n1));
    color = mix(color, asterFlowerBlue, smoothstep(0.3, 0.9, n2) * 0.3);
    color = mix(color, habanero, smoothstep(0.8, 1.0, n3) * 0.1);
    color += asterFlowerBlue * mouseEffect;

    gl_FragColor = vec4(color, 1.0);
}`;

const StatsBar: React.FC = () => {
  const { t } = useTranslation("home");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 120;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }
    syncSize();

    function createShader(glContext: WebGLRenderingContext, type: number, src: string) {
      const shader = glContext.createShader(type);
      if (!shader) return null;
      glContext.shaderSource(shader, src);
      glContext.compileShader(shader);
      return shader;
    }

    const vertShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertShader || !fragShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    const handleMouseMove = (event: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    function render(t: number) {
      if (!gl || !canvas) return;
      if (typeof ResizeObserver === 'undefined') syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  const stats = [
    { value: t('stats.everyCity'), label: t('stats.connectingIndia'), icon: '/city-building-logo.png' },
    { value: '1000+', label: t('stats.certifiedDoctors'), icon: '/doctor-stat-logo.png' },
    { value: '100%', label: t('secureRecords'), icon: '/shield-stat-logo.png' },
    { value: '24/7', label: t('stats.supportAvailable'), icon: '/support-stat-logo.png' },
  ];

  return (
    <section className="stats-bar-section relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ display: 'block' }}
      />
      <div className="stats-bar-container relative z-10">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item group flex items-center justify-center">
            {stat.icon ? (
              <div className="flex items-center justify-center gap-3 sm:gap-4 text-left">
                <div className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-indigo-400/30 shadow-md">
                  <img
                    src={stat.icon}
                    alt={stat.value}
                    className="w-full h-full object-cover scale-[1.35]"
                  />
                </div>
                <div className="transition-transform duration-200 group-hover:scale-[1.03]">
                  <div className="stat-value text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-none drop-shadow-md mb-1.5">{stat.value}</div>
                  <div className="stat-label text-base sm:text-lg lg:text-xl text-slate-100 font-extrabold tracking-wide drop-shadow">{stat.label}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="stat-value text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-none drop-shadow-md mb-1.5">{stat.value}</div>
                <div className="stat-label text-base sm:text-lg lg:text-xl text-slate-100 font-extrabold tracking-wide drop-shadow">{stat.label}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsBar;

