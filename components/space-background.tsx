"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  layer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface Nebula {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  hue: number;
  opacity: number;
  driftX: number;
  driftY: number;
  phase: number;
  pulseSpeed: number;
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let stars: Star[] = [];
    let particles: Particle[] = [];
    let shootingStars: ShootingStar[] = [];
    let nebulae: Nebula[] = [];
    let lastShootingStarTime = 0;
    let time = 0;
    const isDark = resolvedTheme === "dark";
    const starLightness = isDark ? 85 : 45;
    const starSaturation = isDark ? 80 : 70;
    const nebulaLightness = isDark ? 50 : 35;
    const nebulaBaseOpacity = isDark ? 0.02 : 0.035;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      initAll();
    }

    function initAll() {
      initStars();
      initNebulae();
      particles = [];
      shootingStars = [];
    }

    function initStars() {
      stars = [];
      const area = canvas!.width * canvas!.height;
      const count = Math.floor(area / 6000);
      for (let i = 0; i < count; i++) {
        const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2;
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          size: layer === 0 ? Math.random() * 1 + 0.3 : layer === 1 ? Math.random() * 1.5 + 0.8 : Math.random() * 2 + 1.5,
          baseOpacity: layer === 0 ? Math.random() * 0.4 + 0.2 : layer === 1 ? Math.random() * 0.5 + 0.4 : Math.random() * 0.6 + 0.4,
          twinkleSpeed: Math.random() * 2 + 0.5,
          twinkleOffset: Math.random() * Math.PI * 2,
          layer,
        });
      }
    }

    function initNebulae() {
      nebulae = [];
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        nebulae.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          radiusX: 150 + Math.random() * 300,
          radiusY: 100 + Math.random() * 200,
          hue: [220, 260, 280, 320, 200][Math.floor(Math.random() * 5)],
          opacity: nebulaBaseOpacity + Math.random() * 0.025,
          driftX: (Math.random() - 0.5) * 0.15,
          driftY: (Math.random() - 0.5) * 0.1,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.3 + 0.1,
        });
      }
    }

    function spawnParticle() {
      if (particles.length > 30) return;
      particles.push({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 - 0.1,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        life: 0,
        maxLife: 200 + Math.random() * 300,
        hue: 220 + Math.random() * 80,
      });
    }

    function spawnShootingStar() {
      const startX = Math.random() * canvas!.width * 0.8;
      const startY = Math.random() * canvas!.height * 0.4;
      shootingStars.push({
        x: startX,
        y: startY,
        length: 60 + Math.random() * 100,
        speed: 8 + Math.random() * 6,
        angle: Math.PI / 6 + Math.random() * Math.PI / 6,
        opacity: 0.8 + Math.random() * 0.2,
        life: 0,
        maxLife: 40 + Math.random() * 30,
      });
    }

    function drawNebulae() {
      for (const neb of nebulae) {
        neb.x += neb.driftX;
        neb.y += neb.driftY;
        if (neb.x < -neb.radiusX) neb.x = canvas!.width + neb.radiusX;
        if (neb.x > canvas!.width + neb.radiusX) neb.x = -neb.radiusX;
        if (neb.y < -neb.radiusY) neb.y = canvas!.height + neb.radiusY;
        if (neb.y > canvas!.height + neb.radiusY) neb.y = -neb.radiusY;

        const pulse = Math.sin(time * neb.pulseSpeed + neb.phase) * 0.3 + 0.7;
        const gradient = ctx!.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radiusX);
        gradient.addColorStop(0, `hsla(${neb.hue}, 70%, ${nebulaLightness}%, ${neb.opacity * pulse})`);
        gradient.addColorStop(0.5, `hsla(${neb.hue + 20}, 60%, ${nebulaLightness - 10}%, ${neb.opacity * pulse * 0.5})`);
        gradient.addColorStop(1, `hsla(${neb.hue}, 50%, ${nebulaLightness - 20}%, 0)`);

        ctx!.save();
        ctx!.scale(1, neb.radiusY / neb.radiusX);
        ctx!.beginPath();
        ctx!.arc(neb.x, neb.y * (neb.radiusX / neb.radiusY), neb.radiusX, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();
        ctx!.restore();
      }
    }

    function drawStars() {
      for (const star of stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.35 + 0.65;
        const opacity = star.baseOpacity * twinkle;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        const hue = star.layer === 2 ? 200 + Math.random() * 40 : star.layer === 1 ? 220 + Math.random() * 30 : 240;
        ctx!.fillStyle = `hsla(${hue}, ${starSaturation}%, ${starLightness}%, ${opacity})`;
        ctx!.fill();

        if (star.layer === 2 && twinkle > 0.85) {
          const glow = ctx!.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
          glow.addColorStop(0, `hsla(${hue}, ${starSaturation}%, ${starLightness}%, ${opacity * 0.3})`);
          glow.addColorStop(1, `hsla(${hue}, ${starSaturation}%, ${starLightness}%, 0)`);
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
          ctx!.fillStyle = glow;
          ctx!.fill();
        }
      }
    }

    function drawParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        const fadeOpacity = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * (1 - lifeRatio * 0.5), 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, ${starSaturation}%, ${starLightness}%, ${p.opacity * fadeOpacity})`;
        ctx!.fill();

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }
    }

    function drawShootingStars() {
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.life++;

        const lifeRatio = ss.life / ss.maxLife;
        const fadeOpacity = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.7 ? (1 - lifeRatio) * 3.3 : 1;
        const tailX = ss.x - Math.cos(ss.angle) * ss.length;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length;

        const gradient = ctx!.createLinearGradient(tailX, tailY, ss.x, ss.y);
        gradient.addColorStop(0, `hsla(220, ${starSaturation}%, ${starLightness}%, 0)`);
        gradient.addColorStop(0.7, `hsla(220, ${starSaturation}%, ${starLightness + 10}%, ${ss.opacity * fadeOpacity * 0.5})`);
        gradient.addColorStop(1, `hsla(220, ${starSaturation}%, ${starLightness + 15}%, ${ss.opacity * fadeOpacity})`);

        ctx!.beginPath();
        ctx!.moveTo(tailX, tailY);
        ctx!.lineTo(ss.x, ss.y);
        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(220, ${starSaturation}%, ${starLightness + 15}%, ${ss.opacity * fadeOpacity})`;
        ctx!.fill();

        if (ss.life >= ss.maxLife) {
          shootingStars.splice(i, 1);
        }
      }
    }

    function animate(timestamp: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      time += 0.016;

      drawNebulae();
      drawStars();
      drawParticles();
      drawShootingStars();

      if (Math.random() < 0.02) spawnParticle();
      if (timestamp - lastShootingStarTime > 3000 + Math.random() * 5000) {
        spawnShootingStar();
        lastShootingStarTime = timestamp;
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    animationId = requestAnimationFrame(animate);

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.65 }}
    />
  );
}
