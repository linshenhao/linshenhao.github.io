/* ===== Navigation and scroll progress ===== */
const nav = document.querySelector('.nav');
const menuToggle = document.querySelector('.menu-toggle');
function closeMenu() {
  nav.classList.remove('menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', e => { if (!nav.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
    closeMenu();
    menuToggle.focus();
  }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

const progressBar = document.createElement('div');
progressBar.id = 'scroll-progress';
progressBar.setAttribute('aria-hidden', 'true');
document.body.prepend(progressBar);
function updateProgress() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${total > 0 ? window.scrollY / total : 0})`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

/* ===== Pointer light and subtle glass tilt (no idle animation loop) ===== */
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const cursor = document.createElement('div');
cursor.id = 'cursor-glow';
cursor.setAttribute('aria-hidden', 'true');
document.body.appendChild(cursor);
let lightX = 0, lightY = 0, targetX = 0, targetY = 0, lightFrame = 0;
let activeCard = null;
function resetCard() {
  if (!activeCard) return;
  activeCard.style.transform = '';
  activeCard.style.removeProperty('--mx');
  activeCard.style.removeProperty('--my');
  activeCard.style.removeProperty('--glass-x');
  activeCard.style.removeProperty('--glass-y');
  activeCard = null;
}

function getTiltSettings(card) {
  if (card.classList.contains('skill-card')) return { tilt: 13, scale: 1.035, rotation: 0 };
  if (card.classList.contains('timeline-content')) return { tilt: 8, scale: 1.03, rotation: 0 };
  return { tilt: 10, scale: 1.035, rotation: 0 };
}
function paintLight() {
  lightX += (targetX - lightX) * .16;
  lightY += (targetY - lightY) * .16;
  cursor.style.transform = `translate3d(${lightX}px, ${lightY}px, 0)`;
  lightFrame = Math.abs(targetX - lightX) + Math.abs(targetY - lightY) > .5
    ? requestAnimationFrame(paintLight) : 0;
}
function stopMotion() {
  cancelAnimationFrame(lightFrame);
  lightFrame = 0;
  cursor.style.opacity = '0';
  resetCard();
}
document.addEventListener('pointermove', e => {
  if (motionPreference.matches || !finePointer.matches || e.pointerType === 'touch') return;
  targetX = e.clientX;
  targetY = e.clientY;
  if (cursor.style.opacity !== '1') { lightX = targetX; lightY = targetY; }
  cursor.style.opacity = e.target.closest('[data-avatar-scene]') ? '0' : '1';
  if (!lightFrame) lightFrame = requestAnimationFrame(paintLight);
  const card = e.target.closest('[data-tilt]');
  if (activeCard !== card) resetCard();
  if (!card) return;
  activeCard = card;
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const { tilt, scale, rotation } = getTiltSettings(card);
  const rotateX = (0.5 - y) * tilt;
  const rotateY = (x - .5) * tilt;
  card.style.setProperty('--mx', `${x * 100}%`);
  card.style.setProperty('--my', `${y * 100}%`);
  card.style.setProperty('--glass-x', `${x * 100}%`);
  card.style.setProperty('--glass-y', `${y * 100}%`);
  card.style.transform = `perspective(820px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotation}deg) scale(${scale})`;
}, { passive: true });
document.documentElement.addEventListener('pointerleave', stopMotion);
window.addEventListener('blur', stopMotion);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });
motionPreference.addEventListener('change', stopMotion);
finePointer.addEventListener('change', stopMotion);
window.addEventListener('scroll', resetCard, { passive: true });

/* ===== Pointer-controlled homepage portrait ===== */
const avatarScene = document.querySelector('[data-avatar-scene]');
const avatarVideo = avatarScene?.querySelector('[data-avatar-video]');
let homeClosing = false;
if (avatarScene && avatarVideo) {
  const hero = document.querySelector('.hero');
  const cvStory = document.querySelector('[data-cv-story]');
  let targetFrame = 0;
  let gazeFrame = null;
  let requestedFrame = -1;
  let seeking = false;
  let frame = 0;

  const seekHome = () => {
    if (seeking || avatarVideo.readyState < 1 || targetFrame === requestedFrame) return;
    requestedFrame = targetFrame;
    seeking = true;
    avatarVideo.currentTime = (targetFrame + .1) / 24;
  };
  avatarVideo.addEventListener('seeked', () => {
    seeking = false;
    if (targetFrame !== requestedFrame) requestAnimationFrame(seekHome);
  });
  const updateHero = () => {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    const progress = clamp01(-rect.top / rect.height);
    hero.style.setProperty('--hero-copy-opacity',
      (1 - smoothstep(.58, .94, progress)).toFixed(3));
    homeClosing = cvStory.getBoundingClientRect().top <= window.innerHeight * .62;
    if (homeClosing || motionPreference.matches) {
      gazeFrame = null;
      targetFrame = 0;
      seekHome();
    }
  };
  const scheduleHero = () => { if (!frame) frame = requestAnimationFrame(updateHero); };
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || motionPreference.matches || event.pointerType === 'touch' || homeClosing) return;
    const bounds = hero.getBoundingClientRect();
    if (event.clientY < bounds.top || event.clientY > bounds.bottom) {
      if (gazeFrame !== null) {
        gazeFrame = null;
        targetFrame = 0;
        seekHome();
      }
      return;
    }
    const scene = avatarScene.getBoundingClientRect();
    const x = (event.clientX - scene.left - scene.width / 2) / (scene.width * .45);
    const y = (event.clientY / window.innerHeight - .5) * 2;
    let nextFrame = 0;
    if (Math.abs(x) > .12 || Math.abs(y) > .16) {
      if (Math.abs(y) > Math.abs(x) * 1.1) {
        nextFrame = y < 0 ? 108 + Math.round(Math.min(-y, 1) * 47)
          : 165 + Math.round(Math.min(y, 1) * 35);
      } else {
        nextFrame = x < 0 ? 10 + Math.round(Math.min(-x * 1.35, 1) * 40)
          : 63 + Math.round(Math.min(x, 1) * 35);
      }
      nextFrame = Math.round(nextFrame / 3) * 3;
    }
    if (nextFrame === gazeFrame) return;
    gazeFrame = nextFrame;
    targetFrame = nextFrame;
    seekHome();
  }, { passive: true });
  avatarVideo.addEventListener('loadedmetadata', updateHero);
  window.addEventListener('scroll', scheduleHero, { passive: true });
  window.addEventListener('resize', scheduleHero);
  motionPreference.addEventListener('change', scheduleHero);
  avatarVideo.pause();
  updateHero();
}

/* ===== Transparent portrait video and homepage ripple ===== */
const rippleCanvas = avatarScene?.querySelector('[data-avatar-ripple]');
const storyCanvas = avatarScene?.querySelector('[data-story-canvas]');
const workVideo = avatarScene?.querySelector('[data-work-video]');
const workCanvas = avatarScene?.querySelector('[data-work-canvas]');
function setupPortraitCanvas(video, canvas, interactive, matte = false) {
  if (!avatarScene || !video || !canvas) return;
  const canvasClass = canvas === rippleCanvas ? 'has-video-canvas' : canvas === workCanvas ? 'has-work-canvas' : 'has-story-canvas';
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
  if (gl) {
    const vertex = `attribute vec2 position; varying vec2 uv;
      void main() { uv = (position + 1.0) * 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
    const fragment = `precision mediump float;
      varying vec2 uv;
      uniform sampler2D videoFrame;
      uniform vec2 size, videoSize;
      uniform float cover, matte;
      uniform vec3 waves[12];
      float foregroundAlpha(vec3 color, vec2 point) {
        float light = max(max(color.r, color.g), color.b);
        float blueBackground = smoothstep(0.003, 0.025, color.b - color.r);
        vec2 head = (point - vec2(0.5, 0.66)) / vec2(0.16, 0.26);
        float headCore = 1.0 - smoothstep(0.65, 1.0, dot(head, head));
        return max(headCore, smoothstep(0.025, 0.065, light) * (1.0 - blueBackground));
      }
      void main() {
        float scale = mix(min(size.x / videoSize.x, size.y / videoSize.y),
          max(size.x / videoSize.x, size.y / videoSize.y), cover);
        vec2 fitted = videoSize * scale;
        vec2 source = (uv * size - vec2((size.x - fitted.x) * 0.5, 0.0)) / fitted;
        if (source.x < 0.0 || source.x > 1.0 || source.y < 0.0 || source.y > 1.0) {
          gl_FragColor = vec4(0.0); return;
        }
        vec3 original = texture2D(videoFrame, source).rgb;
        float person = matte > 0.5 ? 1.0 : foregroundAlpha(original, source);
        float amount = 0.0;
        for (int i = 0; i < 12; i++) {
          float age = waves[i].z;
          if (age < 0.0 || age > 1.0) continue;
          float scale = 1.5 + 6.0 * (1.0 - exp(-age * 3.0 * 1.09));
          vec2 p = (uv - waves[i].xy) * size / (95.0 * scale * 0.5);
          float r = dot(p, p);
          if (r > 1.0) continue;
          float brush = (exp(-r * 5.0) - 0.006737947) / (1.0 - 0.006737947);
          brush *= 0.55 + 0.45 * cos(sqrt(r) * 6.2831853 * 4.0);
          float opacity = exp(-age * 6.214608);
          amount += brush * opacity * opacity;
        }
        float theta = amount * 6.2831853;
        vec2 push = vec2(sin(theta), cos(theta)) * amount * 0.2;
        float sheen = 0.0;
        if (matte > 0.5) {
          vec2 displaced = clamp(source + push, 0.0, 1.0);
          vec3 color = texture2D(videoFrame, vec2(displaced.x * 0.5, displaced.y)).rgb;
          float alpha = texture2D(videoFrame, vec2(0.5 + displaced.x * 0.5, displaced.y)).r;
          gl_FragColor = vec4((color + vec3(0.16, 0.24, 0.24) * sheen) * alpha, alpha); return;
        }
        vec3 color = texture2D(videoFrame, clamp(source + push * person, 0.0, 1.0)).rgb;
        float alpha = foregroundAlpha(color, clamp(source + push * person, 0.0, 1.0));
        gl_FragColor = vec4((color + vec3(0.16, 0.24, 0.24) * sheen) * alpha, alpha);
      }`;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (vs && fs) {
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        gl.uniform1f(gl.getUniformLocation(program, 'matte'), matte ? 1 : 0);
          gl.uniform1i(gl.getUniformLocation(program, 'videoFrame'), 0);
        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          const sizeLocation = gl.getUniformLocation(program, 'size');
          const videoSizeLocation = gl.getUniformLocation(program, 'videoSize');
          const coverLocation = gl.getUniformLocation(program, 'cover');
        const wavesLocation = gl.getUniformLocation(program, 'waves[0]');
        const waves = Array.from({ length: 12 }, () => ({ x: 0, y: 0, born: -Infinity }));
          const values = new Float32Array(36);
          let nextWave = 0, previousPoint = null, frame = 0, dirty = true;
          const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
          const draw = now => {
            frame = 0;
            if (video.readyState < 2) return;
          const ratio = Math.min(devicePixelRatio || 1, canvas === storyCanvas ? 2 : 1.5);
          const width = Math.round(canvas.clientWidth * ratio);
          const height = Math.round(canvas.clientHeight * ratio);
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
            dirty = true;
          }
          waves.forEach((wave, index) => {
            values[index * 3] = wave.x;
            values[index * 3 + 1] = wave.y;
            values[index * 3 + 2] = wave.born < 0 ? -1 : (now - wave.born) / 3000;
          });
            gl.uniform2f(sizeLocation, width, height);
            gl.uniform2f(videoSizeLocation, video.videoWidth / (matte ? 2 : 1), video.videoHeight);
            gl.uniform1f(coverLocation, getComputedStyle(video).objectFit === 'cover' ? 1 : 0);
          gl.uniform3fv(wavesLocation, values);
          if (dirty) {
            gl.activeTexture(gl.TEXTURE0);
            try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); }
            catch {
              avatarScene.classList.remove(canvasClass);
              return;
            }
            dirty = false;
          }
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          avatarScene.classList.add(canvasClass);
          if (interactive && waves.some(wave => now - wave.born < 3000)) schedule();
          if (!video.paused && !video.ended && !video.requestVideoFrameCallback) { dirty = true; schedule(); }
        };
        if (interactive) {
          const hero = document.querySelector(canvas === rippleCanvas ? '.hero' : canvas === storyCanvas ? '[data-cv-story]' : '[data-work-story]');
          hero.addEventListener('pointermove', event => {
            if (!finePointer.matches || motionPreference.matches || event.pointerType === 'touch' || (canvas === rippleCanvas && homeClosing) || document.querySelector('dialog[open]')) return;
            const bounds = canvas.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width;
            const y = 1 - (event.clientY - bounds.top) / bounds.height;
            if (x < 0 || x > 1 || y < 0 || y > 1) return;
            const top = 1 - y;
            if (canvas === rippleCanvas && (top < .1 || top > .92 || Math.abs(x - .5) > (top < .58 ? .28 : .46))) return;
            if (previousPoint && Math.hypot(event.clientX - previousPoint[0], event.clientY - previousPoint[1]) < 15) return;
            waves[nextWave] = { x, y, born: performance.now() };
            nextWave = (nextWave + 1) % waves.length;
            previousPoint = [event.clientX, event.clientY];
            schedule();
          }, { passive: true });
          hero.addEventListener('pointerleave', () => { previousPoint = null; });
        }
        video.addEventListener('loadeddata', schedule);
        video.addEventListener('seeked', () => { dirty = true; schedule(); });
        let videoFrameCallback = 0;
        const nextVideoFrame = () => {
          videoFrameCallback = 0;
          dirty = true;
          schedule();
          if (!video.paused && !video.ended) videoFrameCallback = video.requestVideoFrameCallback(nextVideoFrame);
        };
        video.addEventListener('play', () => {
          dirty = true;
          schedule();
          if (video.requestVideoFrameCallback && !videoFrameCallback) videoFrameCallback = video.requestVideoFrameCallback(nextVideoFrame);
        });
        video.addEventListener('pause', () => {
          if (videoFrameCallback) video.cancelVideoFrameCallback(videoFrameCallback);
          videoFrameCallback = 0;
        });
        canvas.addEventListener('webglcontextlost', event => {
          event.preventDefault();
          avatarScene.classList.remove(canvasClass);
        });
        window.addEventListener('resize', () => { dirty = true; schedule(); });
        if (video.readyState >= 2) schedule();
      }
    }
  }
}
setupPortraitCanvas(avatarVideo, rippleCanvas, true);
setupPortraitCanvas(avatarScene?.querySelector('[data-story-video]'), storyCanvas, true, true);
setupPortraitCanvas(workVideo, workCanvas, true, true);

/* ===== Scroll-scrubbed portrait and résumé ===== */
const cvStory = document.querySelector('[data-cv-story]');
const workStory = document.querySelector('[data-work-story]');
const workFolder = document.querySelector('[data-work-folder]');
const folderRevealTime = 2.2; // The laptop lid starts opening.
function accelerateWorkExit() {
  if (!workVideo || workVideo.ended) return;
  const remaining = workVideo.duration - workVideo.currentTime;
  workVideo.playbackRate = Number.isFinite(remaining) ? Math.max(workVideo.playbackRate, Math.min(8, Math.max(2, remaining / .65))) : 4;
  workFolder?.classList.add('is-fast-reveal');
  if (!folderManualControl) revealWorkFolder(true);
}
let folderManualControl = false;
let folderControlKey = null;
function revealWorkFolder(show) {
  if (!workFolder) return;
  workFolder.classList.toggle('is-revealed', show);
  workFolder.inert = !show;
  if (!show) {
    workFolder.classList.remove('is-open');
    workFolder.querySelector('.work-folder-trigger').setAttribute('aria-expanded', 'false');
  }
}
if (motionPreference.matches) revealWorkFolder(true);
workVideo?.addEventListener('timeupdate', () => {
  if (!folderManualControl && workVideo.currentTime >= folderRevealTime) revealWorkFolder(true);
});
document.addEventListener('keyup', event => {
  if (event.key === folderControlKey) folderControlKey = null;
});
const journeyStartFrame = 24; // The first second bridges the home and résumé pages.
const physicsFrame = 66; // Hands on hips.
const journeyEndFrame = 90; // Hands raised.
let keyScrollFrame = 0;
let keyScrollDestination = 0;
let keyScrollDirection = 0;
let keyTargetIndex = null;
function scrollToStoryPosition(top, duration) {
  keyScrollDestination = top;
  keyScrollDirection = Math.sign(top - scrollY);
  cancelAnimationFrame(keyScrollFrame);
  if (motionPreference.matches) {
    window.scrollTo({ top, behavior: 'instant' });
    keyTargetIndex = null;
    return;
  }
  const start = window.scrollY;
  const startedAt = performance.now();
  document.documentElement.style.scrollBehavior = 'auto';
  const move = now => {
    const progress = clamp01((now - startedAt) / duration);
    window.scrollTo(0, start + (top - start) * smoothstep(0, 1, progress));
    if (progress < 1) keyScrollFrame = requestAnimationFrame(move);
    else {
      keyScrollFrame = 0;
      keyTargetIndex = null;
      clearTimeout(folderWheelTimer);
      folderWheelTimer = 0;
      document.documentElement.style.removeProperty('scroll-behavior');
    }
  };
  keyScrollFrame = requestAnimationFrame(move);
}
function stopKeyScroll() {
  if (!keyScrollFrame) return;
  cancelAnimationFrame(keyScrollFrame);
  keyScrollFrame = 0;
  keyTargetIndex = null;
  document.documentElement.style.removeProperty('scroll-behavior');
}
function controlWorkFolder(direction, repeat = false, key = null) {
  const workTop = workStory.getBoundingClientRect().top + scrollY;
  const iconsTop = skillsIntro.getBoundingClientRect().top + scrollY;
  if (scrollY < workTop - 2 || scrollY >= iconsTop - 132 || !workFolder) return false;
  if (keyScrollFrame || repeat) return true;
  const visible = workFolder.classList.contains('is-revealed');
  if (scrollY > workTop + innerHeight * .5) {
    if (direction > 0) {
      accelerateWorkExit();
      scrollToStoryPosition(iconsTop, 750);
    } else {
      reverseWorkVideo();
      scrollToStoryPosition(workTop, 750);
    }
    return true;
  }
  folderManualControl = true;
  folderControlKey = key;
  if (direction < 0) reverseWorkVideo();
  else if (workReverseFrame || workVideo.paused && !workVideo.ended) {
    cancelAnimationFrame(workReverseFrame);
    workReverseFrame = 0;
    workVideo.playbackRate = 1;
    workVideo.play().catch(() => {});
  }
  if ((direction > 0 && !visible) || (direction < 0 && visible)) {
    revealWorkFolder(direction > 0);
  } else if (direction > 0) {
    accelerateWorkExit();
    scrollToStoryPosition(iconsTop, 900);
  } else {
    scrollToStoryPosition(workTop - innerHeight, 900);
  }
  return true;
}
let workReverseFrame = 0;
let workReverseTarget = 0;
let workReverseSpeed = 1;
function reverseWorkVideo(duration = 1100) {
  if (!workVideo || workVideo.readyState < 1) return;
  workReverseSpeed = Math.max(.1, workVideo.currentTime / (duration / 1000));
  if (workReverseFrame) return;
  workVideo.pause();
  workReverseTarget = workVideo.currentTime;
  let previousTime = performance.now();
  const reverse = now => {
    workReverseTarget = Math.max(0, workReverseTarget - (now - previousTime) / 1000 * workReverseSpeed);
    previousTime = now;
    const frameTime = Math.round(workReverseTarget * 24) / 24;
    if (!workVideo.seeking && Math.abs(workVideo.currentTime - frameTime) > .025) workVideo.currentTime = frameTime;
    workReverseFrame = workReverseTarget > 0 ? requestAnimationFrame(reverse) : 0;
  };
  workReverseFrame = requestAnimationFrame(reverse);
}
workVideo?.addEventListener('seeked', () => {
  if (workVideo.paused && Math.abs(workVideo.currentTime - workReverseTarget) > .045 && workReverseFrame) {
    workVideo.currentTime = workReverseTarget;
  }
});
let wheelGestureTime = 0;
let wheelGestureDirection = 0;
let wheelGestureDistance = 0;
let workFastGesture = false;
let wheelSpeed = 0;
let folderWheelTimer = 0;
let folderWheelDirection = 0;
window.addEventListener('wheel', event => {
  if (document.querySelector('.project-preview[open], .contact-dialog[open]')) return;
  if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  const direction = Math.sign(event.deltaY);
  const now = performance.now();
  const elapsed = Math.max(16, Math.min(100, now - wheelGestureTime));
  const pixels = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  const freshGesture = now - wheelGestureTime > 260 || direction !== wheelGestureDirection;
  wheelSpeed = freshGesture ? pixels / elapsed : wheelSpeed * .65 + pixels / elapsed * .35;
  const videoRate = Math.min(8, Math.max(1.2, 1.2 + wheelSpeed * .8));
  if (freshGesture) { wheelGestureDistance = 0; workFastGesture = false; }
  wheelGestureTime = now;
  wheelGestureDirection = direction;
  wheelGestureDistance += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  if (keyScrollFrame && direction !== keyScrollDirection) stopKeyScroll();
  if (keyScrollFrame && wheelGestureDistance > 450 && !workFastGesture) {
    workFastGesture = true;
    scrollToStoryPosition(keyScrollDestination, 250);
  }
  const skillsRect = document.querySelector('#skills').getBoundingClientRect();
  if (skillsRect.top <= 122 && skillsRect.bottom > 120) {
    stopKeyScroll();
    skillsTargetIndex = null;
    return;
  }
  const workTop = workStory.getBoundingClientRect().top + scrollY;
  const iconsTop = skillsIntro.getBoundingClientRect().top + scrollY;
  // The first three pages use the same uninterrupted native wheel scroll as the skills pages.
  if (scrollY < iconsTop - 132) {
    stopKeyScroll();
    if (scrollY >= workTop - innerHeight * .55 && workVideo.readyState >= 2) {
      if (direction > 0) {
        cancelAnimationFrame(workReverseFrame);
        workReverseFrame = 0;
        if (!workVideo.ended) {
          workVideo.playbackRate = videoRate;
          workVideo.play().catch(() => {});
        }
        if (wheelSpeed > 1.5) {
          folderManualControl = true;
          workFolder?.classList.add('is-fast-reveal');
          revealWorkFolder(true);
        }
      } else {
        reverseWorkVideo(Math.max(220, 1000 / videoRate));
        if (workVideo.currentTime < 2.2) {
          folderManualControl = false;
          revealWorkFolder(false);
        }
      }
    }
    return;
  }
  if (keyScrollFrame) {
    event.preventDefault();
    return;
  }
  const iconsRect = skillsIntro.getBoundingClientRect();
  if (iconsRect.top <= 132 && iconsRect.bottom > innerHeight * .5) return;
  if (folderWheelTimer && direction === folderWheelDirection) {
    event.preventDefault();
  } else if (controlWorkFolder(direction)) {
    event.preventDefault();
    folderWheelDirection = direction;
  } else {
    stopKeyScroll();
    return;
  }
  clearTimeout(folderWheelTimer);
  folderWheelTimer = setTimeout(() => { folderWheelTimer = 0; }, 180);
}, { passive: false });
window.addEventListener('touchstart', stopKeyScroll, { passive: true });
document.addEventListener('keydown', event => {
  if (document.querySelector('.project-preview[open], .contact-dialog[open]')) return;
  if (!['ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey ||
      event.shiftKey || (event.target instanceof Element &&
      event.target.closest('input, textarea, select, [contenteditable]'))) return;
  const journeyTop = cvStory.getBoundingClientRect().top + window.scrollY;
  const workTop = workStory.getBoundingClientRect().top + window.scrollY;
  const journeyEnd = workTop - window.innerHeight;
  const steps = [0, journeyTop, (journeyTop + journeyEnd) / 2, journeyEnd, workTop];
  const direction = event.key === 'ArrowDown' ? 1 : -1;
  if (event.repeat && folderControlKey === event.key) {
    event.preventDefault();
    return;
  }
  if (event.repeat && skillsIntro.getBoundingClientRect().top <= 132 && skillsIntro.getBoundingClientRect().bottom >= innerHeight * .5) {
    event.preventDefault();
    return;
  }
  if (controlSkillsNavigation(direction)) {
    event.preventDefault();
    return;
  }
  if (controlIconsNavigation(direction)) {
    event.preventDefault();
    return;
  }
  if (controlWorkFolder(direction, event.repeat, event.key)) {
    event.preventDefault();
    return;
  }
  if (keyTargetIndex === null &&
      (window.scrollY >= workTop - 1 || (direction < 0 && window.scrollY < journeyTop - 1))) return;
  let nextIndex = keyTargetIndex === null ? -1 : keyTargetIndex + direction;
  if (keyTargetIndex === null) {
    steps.forEach((top, index) => {
      if (direction > 0 && nextIndex < 0 && top > window.scrollY + 1) nextIndex = index;
      if (direction < 0 && top < window.scrollY - 1) nextIndex = index;
    });
  }
  if (nextIndex < 0 || nextIndex >= steps.length) {
    if (keyTargetIndex !== null) event.preventDefault();
    return;
  }
  event.preventDefault();
  if (event.repeat && keyScrollFrame) return;
  keyTargetIndex = nextIndex;
  scrollToStoryPosition(steps[nextIndex], nextIndex === 1 && direction > 0 ? 1050 : nextIndex <= 1 ? 1250 : 900);
});
document.querySelector('[data-hero-next]')?.addEventListener('click', event => {
  event.preventDefault();
  keyTargetIndex = 1;
  scrollToStoryPosition(cvStory.getBoundingClientRect().top + window.scrollY, 1050);
});
document.querySelector('.nav-links a[href="#journey"]')?.addEventListener('click', event => {
  event.preventDefault();
  keyTargetIndex = 1;
  scrollToStoryPosition(cvStory.getBoundingClientRect().top + window.scrollY, 1050);
});
const storyVideo = document.querySelector('[data-story-video]');
const cvChapters = [...document.querySelectorAll('[data-cv-chapter]')];
const cvIndex = document.querySelector('[data-cv-index]');
const cvProgress = document.querySelector('[data-cv-progress]');
let cvTargetFrame = 0;
let cvSeeking = false;
let cvFrame = 0;
let workPlaying = false;
let educationIntroPlaying = false;
let educationIntroStarted = false;
let educationIntroFrame = 0;
let previousStoryTop = null;

function stopEducationIntro() {
  cancelAnimationFrame(educationIntroFrame);
  educationIntroFrame = 0;
  educationIntroPlaying = false;
  storyVideo.pause();
}

function playEducationIntro() {
  educationIntroStarted = true;
  educationIntroPlaying = true;
  storyVideo.currentTime = 0;
  storyVideo.play().catch(() => { stopEducationIntro(); updateCvStory(); });
  const advance = () => {
    if (!educationIntroPlaying) return;
    if (storyVideo.currentTime >= 1) {
      stopEducationIntro();
    } else educationIntroFrame = requestAnimationFrame(advance);
  };
  educationIntroFrame = requestAnimationFrame(advance);
}

function seekCvVideo() {
  if (!storyVideo || educationIntroPlaying || cvSeeking || storyVideo.readyState < 2) return;
  const time = Math.min(storyVideo.duration - .02, (cvTargetFrame + .1) / 24);
  if (Math.abs(storyVideo.currentTime - time) < .02) return;
  storyVideo.currentTime = time;
  cvSeeking = storyVideo.seeking;
}

function updateCvStory() {
  cvFrame = 0;
  if (!cvStory || motionPreference.matches) return;
  const rect = cvStory.getBoundingClientRect();
  const progress = clamp01(-rect.top / Math.max(1, rect.height - window.innerHeight));
  const folderRect = workStory.getBoundingClientRect();
  const folderProgress = clamp01(-folderRect.top / Math.max(1, folderRect.height - window.innerHeight));
  const bridge = clamp01(1 - rect.top / (window.innerHeight * .55));
  if (bridge === 0) {
    if (educationIntroPlaying) stopEducationIntro();
    educationIntroStarted = false;
  } else if (rect.top > 0 && previousStoryTop !== null && rect.top < previousStoryTop && !educationIntroStarted) {
    playEducationIntro();
  }
  if (progress > .02 && educationIntroPlaying) stopEducationIntro();
  previousStoryTop = rect.top;
  const blend = smoothstep(0, 1, bridge);
  const workBlend = smoothstep(0, 1, clamp01(1 - folderRect.top / (window.innerHeight * .55)));
  avatarScene.style.setProperty('--home-opacity', (1 - blend).toFixed(3));
  avatarScene.style.setProperty('--story-opacity', (workBlend > 0 ? 0 : blend).toFixed(3));
  storyCanvas.style.visibility = workBlend > 0 ? 'hidden' : 'visible';
  avatarScene.style.setProperty('--work-opacity', workBlend.toFixed(3));
  const workExitY = Math.min(0, folderRect.bottom - window.innerHeight);
  avatarScene.style.setProperty('--stage-exit-y', `${workExitY}px`);
  const opacities = [
    smoothstep(.2, .44, progress) * (1 - smoothstep(.56, .76, progress)),
    smoothstep(.63, .88, progress)
  ];
  cvChapters.forEach((chapter, index) => {
    const opacity = opacities[index];
    chapter.style.opacity = opacity.toFixed(3);
    chapter.style.visibility = opacity < .02 ? 'hidden' : 'visible';
    chapter.style.transform = `translateY(${(1 - opacity) * 28}px)`;
  });
  if (cvIndex) cvIndex.textContent = `0${progress < .7 ? 1 : 2} / 02`;
  if (cvProgress) cvProgress.style.transform = `scaleX(${progress})`;
  if (storyVideo?.duration) {
    const poseProgress = progress < .46 ? progress / .46 * .5
      : progress <= .54 ? .5 : .5 + (progress - .54) / .46 * .5;
    cvTargetFrame = rect.top > 0 ? Math.round(bridge * journeyStartFrame)
      : folderRect.top > 0 ? poseProgress <= .5
        ? journeyStartFrame + Math.round(poseProgress * 2 * (physicsFrame - journeyStartFrame))
        : physicsFrame + Math.round((poseProgress - .5) * 2 * (journeyEndFrame - physicsFrame))
        : journeyEndFrame;
    seekCvVideo();
  }
  if (folderProgress > .05 && workPlaying && !workVideo.paused && !workVideo.ended) accelerateWorkExit();
  const playWork = workBlend > 0;
  if (workVideo && playWork !== workPlaying) {
    workPlaying = playWork;
    if (playWork) {
      folderManualControl = false;
      workVideo.playbackRate = 1;
      workFolder?.classList.remove('is-fast-reveal');
      revealWorkFolder(false);
      workVideo.play().catch(() => { workPlaying = false; });
    }
    else {
      workVideo.pause();
      if (workBlend === 0) {
        workVideo.playbackRate = 1;
        workFolder?.classList.remove('is-fast-reveal');
        cancelAnimationFrame(workReverseFrame);
        workReverseFrame = 0;
        workVideo.currentTime = 0;
        folderManualControl = false;
        revealWorkFolder(false);
      }
    }
  }
}

if (cvStory && storyVideo && workStory) {
  storyVideo.pause();
  storyVideo.addEventListener('loadedmetadata', updateCvStory);
  storyVideo.addEventListener('canplay', updateCvStory);
  storyVideo.addEventListener('seeked', () => {
    cvSeeking = false;
    requestAnimationFrame(seekCvVideo);
  });
  const scheduleCvStory = () => {
    if (!cvFrame) cvFrame = requestAnimationFrame(updateCvStory);
  };
  window.addEventListener('scroll', scheduleCvStory, { passive: true });
  window.addEventListener('resize', scheduleCvStory);
  storyVideo.addEventListener('progress', scheduleCvStory);
  workVideo?.addEventListener('canplay', scheduleCvStory);
  motionPreference.addEventListener('change', scheduleCvStory);
  updateCvStory();
}

if (workFolder) {
  const trigger = workFolder.querySelector('.work-folder-trigger');
  trigger.addEventListener('click', () => {
    const open = workFolder.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Close selected work folder' : 'Open selected work folder');
  });
  document.addEventListener('pointerdown', event => {
    if (workFolder.contains(event.target) || document.querySelector('.project-preview[open], .contact-dialog[open]')) return;
    workFolder.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Open selected work folder');
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start, end, value) {
  const progress = clamp01((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

/* ===== Staggered reveal for supporting sections ===== */
const revealItems = document.querySelectorAll(
  '.section-header, .all-projects-link, .contact-inner'
);
revealItems.forEach((item, index) => {
  item.classList.add('scroll-reveal');
  item.style.setProperty('--reveal-delay', `${(index % 4) * 75}ms`);
});

if (motionPreference.matches || !('IntersectionObserver' in window)) {
  revealItems.forEach(item => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .15 });
  revealItems.forEach(item => revealObserver.observe(item));
}

/* =============================================
   Scrollspy — highlight the nav link of the
   section currently in view
   ============================================= */
const spyLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const spy = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const sectionId = e.target.id === 'skills-intro' ? 'work-folder' : e.target.id;
      if (![...spyLinks].some(a => a.getAttribute('href') === `#${sectionId}`)) return;
      spyLinks.forEach(a =>
        {
        const active = a.getAttribute('href') === `#${sectionId}`;
        a.classList.toggle('active', active);
        if (active) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('section[id]').forEach(s => spy.observe(s));

/* ===== Folder project previews ===== */
const projectPreview = document.querySelector('.project-preview');
let previewSource = null;
let previewPointer = null;
function trackPreviewPointer(event) {
  previewPointer = { x: event.clientX, y: event.clientY };
}
document.addEventListener('pointermove', trackPreviewPointer, { passive: true });
document.addEventListener('pointerdown', trackPreviewPointer, { passive: true });
function finishProjectPreview() {
  projectPreview.close();
  previewAnimation?.cancel();
  projectPreview.classList.remove('is-closing');
  const underPointer = previewPointer && document.elementFromPoint(previewPointer.x, previewPointer.y);
  const keepOpen = !previewPointer || (underPointer && workFolder.contains(underPointer));
  workFolder.classList.toggle('is-open', Boolean(keepOpen));
  const trigger = workFolder.querySelector('.work-folder-trigger');
  trigger.setAttribute('aria-expanded', String(Boolean(keepOpen)));
  trigger.setAttribute('aria-label', keepOpen ? 'Close selected work folder' : 'Open selected work folder');
  if (!previewPointer) (keepOpen ? previewSource : trigger).focus({ preventScroll: true });
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
let previewAnimation = null;
function previewSourceTransform() {
  const source = previewSource.getBoundingClientRect();
  const width = projectPreview.offsetWidth;
  const height = projectPreview.offsetHeight;
  const left = projectPreview.offsetLeft;
  const top = projectPreview.offsetTop;
  return `translate(${source.left + source.width / 2 - left - width / 2}px, ${source.top + source.height / 2 - top - height / 2}px) scale(${source.width / width}, ${source.height / height})`;
}
function closeProjectPreview() {
  if (!projectPreview.open || projectPreview.classList.contains('is-closing')) return;
  const target = previewSourceTransform();
  const current = getComputedStyle(projectPreview).transform;
  previewAnimation?.cancel();
  if (motionPreference.matches) { finishProjectPreview(); return; }
  projectPreview.classList.add('is-closing');
  previewAnimation = projectPreview.animate([
    { transform: current === 'none' ? 'translate(0, 0) scale(1)' : current, opacity: 1, borderRadius: '26px' },
    { transform: target, opacity: .15, borderRadius: '15px' }
  ], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  previewAnimation.onfinish = finishProjectPreview;
}
const projectPreviews = {
  deep: {
    title: 'Deep Learning Project',
    cover: 'assets/deep-learning-cover.png',
    alt: 'HMDB51 action recognition cover: video frames, spatial feature extraction and temporal classification.',
    description: 'An AI model that identifies 51 types of human action in videos. It achieved 43.48% test accuracy, showing where it recognises actions reliably and where subtle movements remain difficult. The goal: understand motion, not just individual images.',
    url: 'https://github.com/linshenhao/hmdb51-action-recognition'
  },
  finance: {
    title: 'Financial Market Analytics Project',
    cover: 'assets/financial-market-cover.png',
    alt: 'Pairs trading cover: S&P 500 and STOXX 600 markets, cointegration and mean reversion.',
    description: 'Tests whether trading pairs of related stocks can generate returns in US and European markets. After transaction costs, returns were modest and varied by market, despite low market exposure and drawdowns. The goal: assess whether the strategy holds up under realistic trading conditions.',
    url: 'https://github.com/linshenhao/pairs-trading-sp500-stoxx'
  }
};
document.querySelectorAll('[data-project-preview]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    stopKeyScroll();
    previewSource = link;
    workFolder.classList.add('is-open');
    const trigger = workFolder.querySelector('.work-folder-trigger');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', 'Close selected work folder');
    const project = projectPreviews[link.dataset.projectPreview];
    const cover = projectPreview.querySelector('img');
    cover.src = project.cover;
    cover.alt = project.alt;
    projectPreview.querySelector('h2').textContent = project.title;
    projectPreview.querySelector('p').textContent = project.description;
    projectPreview.querySelector('a').href = project.url;
    projectPreview.showModal();
    projectPreview.scrollTop = 0;
    if (!motionPreference.matches) {
      previewAnimation = projectPreview.animate([
        { transform: previewSourceTransform(), opacity: .15, borderRadius: '15px' },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '26px' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  });
});
projectPreview.querySelector('.project-preview-close').addEventListener('click', closeProjectPreview);
projectPreview.addEventListener('click', event => {
  if (event.target !== projectPreview) return;
  const rect = projectPreview.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProjectPreview();
});

projectPreview.addEventListener('cancel', event => {
  event.preventDefault();
  closeProjectPreview();
});

document.querySelectorAll('[data-education-flip]').forEach(card => {
  const flip = () => {
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(flipped));
    card.querySelector('.education-flip-front').setAttribute('aria-hidden', String(flipped));
    card.querySelector('.education-flip-back').setAttribute('aria-hidden', String(!flipped));
  };
  card.addEventListener('click', flip);
  card.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) flip();
  });
});

/* ===== Icons transition into skills ===== */
const skillsIntro = document.querySelector('.skills-intro');
const iconsVideo = document.querySelector('[data-skills-intro-video]');
const iconsCanvas = document.querySelector('[data-skills-intro-canvas]');
// Composite the packed colour/alpha video on the GPU; retain a 2D fallback.
const iconsGl = iconsCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
let iconsContext, iconsBufferContext, iconsBuffer, iconsProgram;
if (iconsGl) {
  const shader = (type, source) => {
    const value = iconsGl.createShader(type);
    iconsGl.shaderSource(value, source);
    iconsGl.compileShader(value);
    return value;
  };
  iconsProgram = iconsGl.createProgram();
  iconsGl.attachShader(iconsProgram, shader(iconsGl.VERTEX_SHADER,
    'attribute vec2 position; varying vec2 uv; void main(){ uv=(position+1.0)*.5; gl_Position=vec4(position,0.,1.); }'));
  iconsGl.attachShader(iconsProgram, shader(iconsGl.FRAGMENT_SHADER,
    `precision mediump float; varying vec2 uv; uniform sampler2D frame; uniform vec2 size; uniform vec3 waves[12]; void main(){
        float amount = 0.0;
        for (int i = 0; i < 12; i++) {
          float age = waves[i].z;
          if (age < 0.0 || age > 1.0) continue;
          float scale = 1.5 + 6.0 * (1.0 - exp(-age * 3.0 * 1.09));
          vec2 p = (uv - waves[i].xy) * size / (95.0 * scale * 0.5);
          float r = dot(p, p);
          if (r > 1.0) continue;
          float brush = (exp(-r * 5.0) - 0.006737947) / (1.0 - 0.006737947);
          brush *= 0.55 + 0.45 * cos(sqrt(r) * 6.2831853 * 4.0);
          float opacity = exp(-age * 6.214608);
          amount += brush * opacity * opacity;
        }
        float theta = amount * 6.2831853;
        vec2 push = vec2(sin(theta), cos(theta)) * amount * 0.2;
        float sheen = 0.0;

 vec2 point=clamp(uv+push,0.0,1.0); vec3 color=texture2D(frame,vec2(point.x*.5,point.y)).rgb; float a=texture2D(frame,vec2(.5+point.x*.5,point.y)).r; if(a<.016)a=0.; gl_FragColor=vec4((color+vec3(.16,.24,.24)*sheen)*a,a); }`));
  iconsGl.linkProgram(iconsProgram);
  iconsGl.useProgram(iconsProgram);
  const buffer = iconsGl.createBuffer();
  iconsGl.bindBuffer(iconsGl.ARRAY_BUFFER, buffer);
  iconsGl.bufferData(iconsGl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), iconsGl.STATIC_DRAW);
  const position = iconsGl.getAttribLocation(iconsProgram, 'position');
  iconsGl.enableVertexAttribArray(position);
  iconsGl.vertexAttribPointer(position, 2, iconsGl.FLOAT, false, 0, 0);
  iconsGl.bindTexture(iconsGl.TEXTURE_2D, iconsGl.createTexture());
  iconsGl.texParameteri(iconsGl.TEXTURE_2D, iconsGl.TEXTURE_MIN_FILTER, iconsGl.LINEAR);
  iconsGl.texParameteri(iconsGl.TEXTURE_2D, iconsGl.TEXTURE_MAG_FILTER, iconsGl.LINEAR);
  iconsGl.texParameteri(iconsGl.TEXTURE_2D, iconsGl.TEXTURE_WRAP_S, iconsGl.CLAMP_TO_EDGE);
  iconsGl.texParameteri(iconsGl.TEXTURE_2D, iconsGl.TEXTURE_WRAP_T, iconsGl.CLAMP_TO_EDGE);
  iconsGl.pixelStorei(iconsGl.UNPACK_FLIP_Y_WEBGL, true);
  iconsGl.viewport(0, 0, 1280, 720);
} else {
  iconsContext = iconsCanvas.getContext('2d');
  iconsBuffer = document.createElement('canvas');
  iconsBuffer.width = 2560;
  iconsBuffer.height = 720;
  iconsBufferContext = iconsBuffer.getContext('2d', { willReadFrequently: true });
}
const iconsWaves = Array.from({ length: 12 }, () => ({ x: 0, y: 0, born: -Infinity }));
const iconsWaveValues = new Float32Array(36);
let iconsWaveIndex = 0, iconsRippleFrame = 0, iconsPreviousPoint = null;
function animateIconsRipples() {
  iconsRippleFrame = 0;
  drawIcons();
  if (iconsWaves.some(wave => performance.now() - wave.born < 3000)) iconsRippleFrame = requestAnimationFrame(animateIconsRipples);
}
skillsIntro.addEventListener('pointermove', event => {
  if (!iconsGl || !finePointer.matches || motionPreference.matches || event.pointerType === 'touch' || document.querySelector('dialog[open]')) return;
  const bounds = iconsCanvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width, y = 1 - (event.clientY - bounds.top) / bounds.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  if (iconsPreviousPoint && Math.hypot(event.clientX - iconsPreviousPoint[0], event.clientY - iconsPreviousPoint[1]) < 15) return;
  iconsWaves[iconsWaveIndex] = { x, y, born: performance.now() };
  iconsWaveIndex = (iconsWaveIndex + 1) % iconsWaves.length;
  iconsPreviousPoint = [event.clientX, event.clientY];
  if (!iconsRippleFrame) iconsRippleFrame = requestAnimationFrame(animateIconsRipples);
}, { passive: true });
skillsIntro.addEventListener('pointerleave', () => { iconsPreviousPoint = null; });
let iconsTextureTime = -1;
function drawIcons() {
  if (iconsVideo.readyState < 2) return;
  if (iconsGl) {
    const now = performance.now();
    iconsWaves.forEach((wave, i) => {
      iconsWaveValues[i * 3] = wave.x;
      iconsWaveValues[i * 3 + 1] = wave.y;
      iconsWaveValues[i * 3 + 2] = (now - wave.born) / 3000;
    });
    iconsGl.uniform2f(iconsGl.getUniformLocation(iconsProgram, 'size'), iconsCanvas.clientWidth, iconsCanvas.clientHeight);
    iconsGl.uniform3fv(iconsGl.getUniformLocation(iconsProgram, 'waves[0]'), iconsWaveValues);
    if (iconsTextureTime !== iconsVideo.currentTime) {
      iconsGl.texImage2D(iconsGl.TEXTURE_2D, 0, iconsGl.RGBA, iconsGl.RGBA, iconsGl.UNSIGNED_BYTE, iconsVideo);
      iconsTextureTime = iconsVideo.currentTime;
    }
    iconsGl.drawArrays(iconsGl.TRIANGLES, 0, 6);
    return;
  }
  iconsBufferContext.drawImage(iconsVideo, 0, 0, 2560, 720);
  const color = iconsBufferContext.getImageData(0, 0, 1280, 720);
  const alpha = iconsBufferContext.getImageData(1280, 0, 1280, 720);
  for (let i = 3; i < color.data.length; i += 4) color.data[i] = alpha.data[i - 3] < 4 ? 0 : alpha.data[i - 3];
  iconsContext.putImageData(color, 0, 0);
}

let iconsExitTimer = 0;
let iconsSeekFrame = 0, iconsTargetTime = 0;
function seekIconsProgress() {
  iconsSeekFrame = 0;
  if (iconsVideo.readyState < 2 || iconsVideo.seeking) return;
  if (Math.abs(iconsVideo.currentTime - iconsTargetTime) > 1 / 48) iconsVideo.currentTime = iconsTargetTime;
}
function updateIconsProgress() {
  const rect = skillsIntro.getBoundingClientRect();
  const travel = Math.max(1, skillsIntro.offsetHeight - innerHeight);
  const progress = Math.max(0, Math.min(1, -rect.top / travel));
  iconsVideo.pause();
  if (Number.isFinite(iconsVideo.duration)) {
    iconsTargetTime = Math.min(iconsVideo.duration - .01, progress / .8 * iconsVideo.duration);
    if (!iconsSeekFrame) iconsSeekFrame = requestAnimationFrame(seekIconsProgress);
  }
  skillsIntro.classList.toggle('is-complete', progress >= .8);
  skillsIntro.classList.toggle('is-title-visible', progress >= .9);
}
iconsVideo.addEventListener('loadeddata', () => { drawIcons(); updateIconsProgress(); });
iconsVideo.addEventListener('seeked', () => {
  drawIcons();
  if (!iconsSeekFrame) iconsSeekFrame = requestAnimationFrame(seekIconsProgress);
});
window.addEventListener('scroll', updateIconsProgress, { passive: true });
window.addEventListener('resize', updateIconsProgress);
updateIconsProgress();

function controlIconsNavigation(direction, wheel = false) {
  if (wheel) return false;
  const rect = skillsIntro.getBoundingClientRect();
  if (rect.top > 132 || rect.bottom < innerHeight * .5) return false;
  const top = rect.top + scrollY;
  const travel = Math.max(1, skillsIntro.offsetHeight - innerHeight);
  const progress = Math.max(0, Math.min(1, -rect.top / travel));
  if (direction > 0) {
    scrollToStoryPosition(progress < .89 ? top + travel * .95 : document.querySelector('#skills').getBoundingClientRect().top + scrollY, 750);
  } else {
    scrollToStoryPosition(progress > .05 ? top : workStory.getBoundingClientRect().top + scrollY, 750);
  }
  return true;
}

const cardStacks = [...document.querySelectorAll('.skills-stack')].map(stack => ({
  stack, header: stack.parentElement.querySelector('.section-header'), last: stack.lastElementChild
}));
let skillsHeaderFrame = 0;
function updateSkillsHeaderExit() {
  skillsHeaderFrame = 0;
  const exits = cardStacks.map(({ stack, last }) => {
    const style = getComputedStyle(last);
    return style.position === 'sticky'
      ? Math.min(0, stack.getBoundingClientRect().bottom - last.getBoundingClientRect().height
        - parseFloat(style.marginBottom) - (250 + (stack.children.length - 1) * 19))
      : 0;
  });
  cardStacks.forEach(({ stack, header }, index) => {
    stack.style.setProperty('--skills-exit-y', `${exits[index]}px`);
    header.style.transform = `translateY(${exits[index]}px)`;
  });
}
function scheduleSkillsHeaderExit() {
  if (!skillsHeaderFrame) skillsHeaderFrame = requestAnimationFrame(updateSkillsHeaderExit);
}
window.addEventListener('scroll', scheduleSkillsHeaderExit, { passive: true });
window.addEventListener('resize', scheduleSkillsHeaderExit);
updateSkillsHeaderExit();

let skillsTargetIndex = null;
function skillsCardPositions(section) {
  const stack = section.querySelector('.skills-stack');
  const cards = [...stack.children];
  const stackTop = stack.getBoundingClientRect().top + scrollY;
  let offset = 0;
  return cards.map(card => {
    const style = getComputedStyle(card);
    const top = style.position === 'sticky' ? parseFloat(style.top) : 120;
    const position = stackTop + offset - top;
    offset += card.getBoundingClientRect().height + parseFloat(style.marginBottom);
    return position;
  });
}
function controlSkillsNavigation(direction) {
  const experience = document.querySelector('#experience');
  const isExperience = scrollY >= experience.getBoundingClientRect().top + scrollY - 122;
  const section = isExperience ? experience : document.querySelector('#skills');
  const positions = skillsCardPositions(section);
  const skillsTop = section.getBoundingClientRect().top + scrollY - 120;
  const end = document.querySelector(isExperience ? '#contact' : '#experience').getBoundingClientRect().top + scrollY - 120;
  if (scrollY < skillsTop - 2 || scrollY >= end - 2) {
    skillsTargetIndex = null;
    return false;
  }
  let index = keyScrollFrame && skillsTargetIndex !== null ? skillsTargetIndex : -1;
  if (index < 0) positions.forEach((top, i) => { if (scrollY >= top - 3) index = i; });
  const next = index + direction;
  if (next < 0 && isExperience) {
    skillsTargetIndex = null;
    const previous = skillsCardPositions(document.querySelector('#skills'));
    scrollToStoryPosition(previous[previous.length - 1], 650);
  } else if (next < 0) {
    clearTimeout(iconsExitTimer);
    skillsIntro.classList.add('is-title-visible');
    skillsTargetIndex = null;
    scrollToStoryPosition(skillsIntro.getBoundingClientRect().top + scrollY, 750);
  } else if (next >= positions.length) {
    skillsTargetIndex = null;
    scrollToStoryPosition(end, 750);
  } else {
    skillsTargetIndex = next;
    scrollToStoryPosition(positions[next], 650);
  }
  return true;
}

/* RubberSegment-inspired leading/trailing edges on one glass surface. */
const navTrack = document.querySelector('.nav-links');
const navThumb = document.createElement('span');
navThumb.className = 'nav-glass-thumb';
navThumb.setAttribute('aria-hidden', 'true');
navTrack.append(navThumb);
let navHover = null, navFrame = 0, navLeft = 0, navRight = 0, navTargetLeft = 0, navTargetRight = 0;
function moveNavGlass(link) {
  if (!link || !navTrack.offsetWidth) { navThumb.hidden = true; return; }
  const box = navTrack.getBoundingClientRect(), rect = link.getBoundingClientRect();
  navTargetLeft = rect.left - box.left;
  navTargetRight = rect.right - box.left;
  if (navThumb.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navLeft = navTargetLeft; navRight = navTargetRight;
  }
  navThumb.hidden = false;
  if (!navFrame) navFrame = requestAnimationFrame(animateNavGlass);
}
function animateNavGlass() {
  const rightward = (navTargetLeft + navTargetRight) > (navLeft + navRight);
  navLeft += (navTargetLeft - navLeft) * (rightward ? .15 : .25);
  navRight += (navTargetRight - navRight) * (rightward ? .25 : .15);
  navThumb.style.clipPath = `inset(0 ${Math.max(0, navTrack.offsetWidth - navRight)}px 0 ${Math.max(0, navLeft)}px round 24px)`;
  navFrame = Math.abs(navTargetLeft - navLeft) + Math.abs(navTargetRight - navRight) > .1
    ? requestAnimationFrame(animateNavGlass) : 0;
}
function restoreNavGlass() { navHover = null; moveNavGlass(navTrack.querySelector('a.active') || navTrack.querySelector('a')); }
navTrack.querySelectorAll('a').forEach(link => {
  link.addEventListener('pointerenter', () => { navHover = link; moveNavGlass(link); });
  link.addEventListener('focus', () => { navHover = link; moveNavGlass(link); });
  link.addEventListener('click', () => { navHover = link; moveNavGlass(link); });
});
// Keep the last selection until the visitor resumes page navigation.
window.addEventListener('wheel', () => { navHover = null; }, { passive: true });
window.addEventListener('touchmove', () => { navHover = null; }, { passive: true });
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) navHover = null;
});
new MutationObserver(() => { if (!navHover) restoreNavGlass(); }).observe(navTrack, { subtree: true, attributes: true, attributeFilter: ['class'] });
new ResizeObserver(() => moveNavGlass(navHover || navTrack.querySelector('a.active') || navTrack.querySelector('a'))).observe(navTrack);
restoreNavGlass();
const contactDialog = document.querySelector('#contact-dialog');
const contactTrigger = document.querySelector('.nav-cta');
let contactAnimation = null;
function contactSourceTransform() {
  const source = contactTrigger.getBoundingClientRect();
  return `translate(${source.left + source.width / 2 - contactDialog.offsetLeft - contactDialog.offsetWidth / 2}px, ${source.top + source.height / 2 - contactDialog.offsetTop - contactDialog.offsetHeight / 2}px) scale(${source.width / contactDialog.offsetWidth}, ${source.height / contactDialog.offsetHeight})`;
}
function closeContactDialog() {
  if (!contactDialog.open || contactDialog.classList.contains('is-closing')) return;
  const current = getComputedStyle(contactDialog).transform;
  const finish = () => {
    contactDialog.close();
    contactAnimation?.cancel();
    contactDialog.classList.remove('is-closing');
  };
  contactAnimation?.cancel();
  if (motionPreference.matches) { finish(); return; }
  contactDialog.classList.add('is-closing');
  contactAnimation = contactDialog.animate([
    { transform: current === 'none' ? 'translate(0, 0) scale(1)' : current, opacity: 1, borderRadius: '26px' },
    { transform: contactSourceTransform(), opacity: .15, borderRadius: '15px' }
  ], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  contactAnimation.onfinish = finish;
}
contactDialog.querySelector('.contact-dialog-close').addEventListener('click', closeContactDialog);
contactTrigger.addEventListener('click', () => {
  closeMenu();
  stopKeyScroll();
  contactDialog.showModal();
  if (!motionPreference.matches) {
    contactAnimation = contactDialog.animate([
      { transform: contactSourceTransform(), opacity: .15, borderRadius: '15px' },
      { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '26px' }
    ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
});
contactDialog.addEventListener('cancel', event => { event.preventDefault(); closeContactDialog(); });
contactDialog.addEventListener('click', event => {
  const rect = contactDialog.getBoundingClientRect();
  if (event.target === contactDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeContactDialog();
});
