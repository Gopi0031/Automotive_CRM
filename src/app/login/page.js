// app/login/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Particle component for background animation
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];
    let sparks = [];
    let mouse = { x: null, y: null };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.speedY = (Math.random() - 0.5) * 0.8;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.color = `rgba(${100 + Math.random() * 155}, ${150 + Math.random() * 105}, 255, ${this.opacity})`;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (mouse.x !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            this.x -= dx * 0.02;
            this.y -= dy * 0.02;
          }
        }

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    // Welding sparks that appear on mouse move
    class Spark {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 5;
        this.speedY = (Math.random() - 0.5) * 5 - 2;
        this.gravity = 0.12;
        this.life = Math.random() * 25 + 10;
        this.maxLife = this.life;
      }
      update() {
        this.x += this.speedX;
        this.speedY += this.gravity;
        this.y += this.speedY;
        this.speedX *= 0.98;
        this.life--;
      }
      draw() {
        const fade = this.life / this.maxLife;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * fade);
        gradient.addColorStop(0, `rgba(255, 220, 120, ${fade})`);
        gradient.addColorStop(0.5, `rgba(100, 180, 255, ${fade * 0.6})`);
        gradient.addColorStop(1, `rgba(59, 130, 246, 0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * fade * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }

    let sparkTimer = 0;

    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 180, 255, ${0.15 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();

      // Random sparks burst
      sparkTimer++;
      if (sparkTimer % 90 === 0) {
        const sx = Math.random() * canvas.width;
        const sy = Math.random() * canvas.height;
        for (let i = 0; i < 6; i++) {
          sparks.push(new Spark(sx, sy));
        }
      }

      // Mouse trail sparks
      if (mouse.x !== null && Math.random() > 0.88) {
        sparks.push(new Spark(mouse.x, mouse.y));
      }

      sparks = sparks.filter((s) => s.life > 0);
      sparks.forEach((s) => {
        s.update();
        s.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

// Floating geometric shapes with garage elements
function FloatingShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Large gradient orb */}
      <div
        className="absolute rounded-full blur-3xl animate-float-slow"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)',
          top: '-10%',
          right: '-5%',
        }}
      />
      {/* Medium orb */}
      <div
        className="absolute rounded-full blur-3xl animate-float-medium"
        style={{
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)',
          bottom: '-5%',
          left: '-5%',
        }}
      />
      {/* Small accent orb */}
      <div
        className="absolute rounded-full blur-2xl animate-float-fast"
        style={{
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1), transparent 70%)',
          top: '50%',
          left: '60%',
        }}
      />
      {/* Rotating gear ring 1 */}
      <div
        className="absolute animate-spin-very-slow"
        style={{
          width: '500px',
          height: '500px',
          top: '20%',
          left: '-10%',
        }}
      >
        <svg viewBox="0 0 500 500" className="w-full h-full">
          <circle cx="250" cy="250" r="200" fill="none" stroke="rgba(100, 180, 255, 0.06)" strokeWidth="2" strokeDasharray="20 10" />
          <circle cx="250" cy="250" r="185" fill="none" stroke="rgba(100, 180, 255, 0.03)" strokeWidth="1" />
          {[...Array(14)].map((_, i) => {
            const angle = (i * 360) / 14;
            const rad = (angle * Math.PI) / 180;
            const x1 = 250 + Math.cos(rad) * 196;
            const y1 = 250 + Math.sin(rad) * 196;
            const x2 = 250 + Math.cos(rad) * 216;
            const y2 = 250 + Math.sin(rad) * 216;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(100, 180, 255, 0.07)" strokeWidth="7" strokeLinecap="round" />
            );
          })}
        </svg>
      </div>
      {/* Rotating gear ring 2 */}
      <div
        className="absolute animate-spin-very-slow-reverse"
        style={{
          width: '350px',
          height: '350px',
          bottom: '10%',
          right: '-5%',
        }}
      >
        <svg viewBox="0 0 350 350" className="w-full h-full">
          <circle cx="175" cy="175" r="140" fill="none" stroke="rgba(139, 92, 246, 0.05)" strokeWidth="2" strokeDasharray="15 8" />
          {[...Array(10)].map((_, i) => {
            const angle = (i * 360) / 10;
            const rad = (angle * Math.PI) / 180;
            const x1 = 175 + Math.cos(rad) * 136;
            const y1 = 175 + Math.sin(rad) * 136;
            const x2 = 175 + Math.cos(rad) * 152;
            const y2 = 175 + Math.sin(rad) * 152;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(139, 92, 246, 0.06)" strokeWidth="5" strokeLinecap="round" />
            );
          })}
        </svg>
      </div>
      {/* Wrench silhouette - top left */}
      <div
        className="absolute animate-tool-float"
        style={{ top: '8%', left: '8%', opacity: 0.04 }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64" fill="white">
          <path d="M52.7 7.3a8 8 0 00-9.9-1.1l-5.5 3.7a3 3 0 00-.7 4.2l1.2 1.8-20.4 20.4-1.8-1.2a3 3 0 00-4.2.7l-3.7 5.5a8 8 0 001.1 9.9l4.5 4.5a8 8 0 009.9 1.1l5.5-3.7a3 3 0 00.7-4.2l-1.2-1.8 20.4-20.4 1.8 1.2a3 3 0 004.2-.7l3.7-5.5a8 8 0 00-1.1-9.9l-4.5-4.5z" />
        </svg>
      </div>
      {/* Gear silhouette - bottom right */}
      <div
        className="absolute animate-spin-very-slow"
        style={{ bottom: '15%', right: '12%', opacity: 0.03 }}
      >
        <svg width="100" height="100" viewBox="0 0 64 64" fill="white">
          <path d="M32 20a12 12 0 1012 12A12 12 0 0032 20zm0 18a6 6 0 116-6 6 6 0 01-6 6z" />
          <path d="M56 28h-4.1a20.1 20.1 0 00-2.4-5.7l2.9-2.9a2 2 0 000-2.8l-5-5a2 2 0 00-2.8 0l-2.9 2.9A20.1 20.1 0 0036 12.1V8a2 2 0 00-2-2h-4a2 2 0 00-2 2v4.1a20.1 20.1 0 00-5.7 2.4l-2.9-2.9a2 2 0 00-2.8 0l-5 5a2 2 0 000 2.8l2.9 2.9A20.1 20.1 0 0012.1 28H8a2 2 0 00-2 2v4a2 2 0 002 2h4.1a20.1 20.1 0 002.4 5.7l-2.9 2.9a2 2 0 000 2.8l5 5a2 2 0 002.8 0l2.9-2.9a20.1 20.1 0 005.7 2.4V56a2 2 0 002 2h4a2 2 0 002-2v-4.1a20.1 20.1 0 005.7-2.4l2.9 2.9a2 2 0 002.8 0l5-5a2 2 0 000-2.8l-2.9-2.9a20.1 20.1 0 002.4-5.7H56a2 2 0 002-2v-4a2 2 0 00-2-2z" />
        </svg>
      </div>
    </div>
  );
}

// Animated garage/car icon SVG with wrench
function GarageCarIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Garage roof */}
      <path
        d="M8 28L32 10L56 28"
        className="stroke-blue-400/60"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Garage walls */}
      <path
        d="M12 28v22h40V28"
        className="stroke-blue-400/40"
        strokeWidth="1.5"
        fill="rgba(59, 130, 246, 0.05)"
      />
      {/* Garage door */}
      <rect x="20" y="36" width="24" height="14" rx="1" className="fill-blue-500/10 stroke-blue-400/50" strokeWidth="1" />
      {/* Door lines */}
      <line x1="20" y1="40" x2="44" y2="40" className="stroke-blue-400/20" strokeWidth="0.5" />
      <line x1="20" y1="44" x2="44" y2="44" className="stroke-blue-400/20" strokeWidth="0.5" />
      <line x1="20" y1="48" x2="44" y2="48" className="stroke-blue-400/20" strokeWidth="0.5" />
      {/* Car inside garage */}
      <path
        d="M24 44h16v4a1 1 0 01-1 1H25a1 1 0 01-1-1v-4z"
        className="fill-cyan-500/15 stroke-cyan-400/60"
        strokeWidth="1"
      />
      <path
        d="M26 44l2-4h8l2 4"
        className="fill-blue-500/10 stroke-cyan-400/50"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Car wheels */}
      <circle cx="28" cy="49" r="1.5" className="fill-slate-700 stroke-blue-400/60" strokeWidth="0.8" />
      <circle cx="36" cy="49" r="1.5" className="fill-slate-700 stroke-blue-400/60" strokeWidth="0.8" />
      {/* Wrench accent */}
      <g className="animate-tool-swing" style={{ transformOrigin: '50px 18px' }}>
        <path
          d="M48 14l-4 4m0 0l5 5m-5-5l-1 3 3-1"
          className="stroke-cyan-400/70"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="12" r="2" className="stroke-cyan-400/50 fill-cyan-400/10" strokeWidth="1" />
      </g>
      {/* Headlights glow */}
      <circle cx="25" cy="43" r="0.8" className="fill-yellow-400/50 animate-headlight-pulse" />
      <circle cx="39" cy="43" r="0.8" className="fill-yellow-400/50 animate-headlight-pulse" />
    </svg>
  );
}

// Eye icon for password toggle
function EyeIcon({ open }) {
  if (open) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [formStep, setFormStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    const stepTimer = setTimeout(() => setFormStep(1), 300);
    const stepTimer2 = setTimeout(() => setFormStep(2), 500);
    const stepTimer3 = setTimeout(() => setFormStep(3), 700);
    return () => {
      clearTimeout(timer);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Login failed', {
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            backdropFilter: 'blur(10px)',
          },
          iconTheme: { primary: '#f87171', secondary: '#0f172a' },
        });
        return;
      }

      toast.success('Welcome! Opening garage...', {
        style: {
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#34d399',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          backdropFilter: 'blur(10px)',
        },
        iconTheme: { primary: '#34d399', secondary: '#0f172a' },
      });
      localStorage.setItem('user', JSON.stringify(data.user));

      setTimeout(() => router.push('/dashboard'), 800);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login', {
        style: {
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          backdropFilter: 'blur(10px)',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@autobilling.com');
    setPassword('Admin@123');
    toast('Demo credentials filled!', {
      icon: '🔧',
      style: {
        background: 'rgba(15, 23, 42, 0.9)',
        color: '#93c5fd',
        border: '1px solid rgba(147, 197, 253, 0.3)',
        backdropFilter: 'blur(10px)',
      },
    });
  };

  return (
    <>
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-5px); }
          75% { transform: translateY(-30px) translateX(15px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(15px) translateX(-10px); }
          66% { transform: translateY(-15px) translateX(10px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes spin-very-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-very-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.25), 0 0 60px rgba(59, 130, 246, 0.08); }
        }
        @keyframes scan-line {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes garage-door-open {
          0% { transform: translateY(0) scaleY(1); }
          30% { transform: translateY(-2px) scaleY(0.98); }
          60% { transform: translateY(2px) scaleY(1); }
          100% { transform: translateY(0) scaleY(1); }
        }
        @keyframes tool-swing {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes tool-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(3deg); }
          75% { transform: translateY(5px) rotate(-2deg); }
        }
        @keyframes headlight-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes engine-rev {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-2px) rotate(-0.5deg); }
          20% { transform: translateX(2px) rotate(0.5deg); }
          30% { transform: translateX(-1px) rotate(-0.3deg); }
          40% { transform: translateX(1px) rotate(0.3deg); }
          50% { transform: translateX(0) rotate(0deg); }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(59, 130, 246, 0.3); }
          50% { border-color: rgba(139, 92, 246, 0.5); }
        }

        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
        .animate-spin-very-slow { animation: spin-very-slow 30s linear infinite; }
        .animate-spin-very-slow-reverse { animation: spin-very-slow-reverse 25s linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-garage-door { animation: garage-door-open 4s ease-in-out infinite; }
        .animate-tool-swing { animation: tool-swing 2.5s ease-in-out infinite; }
        .animate-tool-float { animation: tool-float 6s ease-in-out infinite; }
        .animate-headlight-pulse { animation: headlight-pulse 2s ease-in-out infinite; }
        .animate-engine-rev { animation: engine-rev 3s ease-in-out infinite; }
        .animate-border-glow { animation: border-glow 3s ease-in-out infinite; }

        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(148, 163, 184, 1) 0%,
            rgba(226, 232, 240, 1) 25%,
            rgba(148, 163, 184, 1) 50%,
            rgba(226, 232, 240, 1) 75%,
            rgba(148, 163, 184, 1) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }

        .gradient-border {
          position: relative;
          background: linear-gradient(135deg, 
            rgba(15, 23, 42, 0.95), 
            rgba(30, 41, 59, 0.95)
          );
        }
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(59, 130, 246, 0.4),
            rgba(139, 92, 246, 0.2),
            rgba(6, 182, 212, 0.3),
            rgba(59, 130, 246, 0.4)
          );
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          z-index: -1;
        }

        .scan-line::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
          animation: scan-line 4s ease-in-out infinite;
          pointer-events: none;
        }

        .input-glow:focus-within {
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5),
                      0 0 20px rgba(59, 130, 246, 0.1),
                      0 0 40px rgba(59, 130, 246, 0.05);
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        ::-webkit-scrollbar-thumb { 
          background: rgba(59, 130, 246, 0.3); 
          border-radius: 3px; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: rgba(59, 130, 246, 0.5); 
        }
      `}</style>

      <div className="min-h-screen w-full flex items-center justify-center overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 25%, #111827 50%, #0f172a 75%, #0a0e1a 100%)',
        }}
      >
        {/* Background layers */}
        <FloatingShapes />
        <ParticleField />

        {/* Subtle grid overlay */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            zIndex: 1,
          }}
        />

        {/* Main content */}
        <div
          className="relative w-full max-w-md mx-4 sm:mx-auto"
          style={{ zIndex: 10 }}
        >
          {/* Logo & Header */}
          <div
            className={`text-center mb-6 sm:mb-8 transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
            }`}
          >
            {/* Animated garage icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-xl animate-pulse-glow">
                  <GarageCarIcon className="w-10 h-10 sm:w-12 sm:h-12 animate-engine-rev" />
                </div>
                {/* Decorative dots */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full" />
                {/* Wrench decoration */}
                <div className="absolute -bottom-1.5 -left-1.5 text-sm animate-tool-swing" style={{ transformOrigin: 'top center' }}>
                  🔧
                </div>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Automotive
              </span>
              <span>  </span>
              <span className="bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                Login 
              </span>
            </h1>
            <p className="shimmer-text text-sm sm:text-base mt-2 font-light tracking-widest uppercase">
               Billing System
            </p>
            {/* Decorative garage line */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-blue-500/30" />
              <svg className="w-4 h-4 text-blue-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58-3.07M12 12l-6.58-3.07M12 12v7.5M12 12l6.58-3.07M12 12l5.58 3.07M12 4.5l6.58 3.07M12 4.5L5.42 7.57M12 4.5V12" />
              </svg>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-blue-500/30" />
            </div>
          </div>

          {/* Login Card */}
          <div
            className={`gradient-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-blue-900/20 scan-line transition-all duration-1000 delay-200 ${
              mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
            }`}
          >
            {/* Card header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1 flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-blue-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                </svg>
                Welcome
              </h2>
              <p className="text-slate-400 text-sm">Sign in to access your workshop</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Email Field */}
              <div
                className={`transition-all duration-700 ${
                  formStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                }`}
              >
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 tracking-wide">
                  Email Address
                </label>
                <div
                  className={`relative group input-glow rounded-xl transition-all duration-300 ${
                    focusedField === 'email'
                      ? 'ring-1 ring-blue-500/50'
                      : ''
                  }`}
                >
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="admin@autobilling.com"
                    required
                    disabled={loading}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 ${
                      focusedField === 'email' ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div
                className={`transition-all duration-700 ${
                  formStep >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                }`}
              >
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 tracking-wide">
                  Password
                </label>
                <div
                  className={`relative group input-glow rounded-xl transition-all duration-300 ${
                    focusedField === 'password'
                      ? 'ring-1 ring-blue-500/50'
                      : ''
                  }`}
                >
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 sm:pl-12 pr-12 py-3 sm:py-3.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors duration-300 focus:outline-none"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 ${
                      focusedField === 'password' ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div
                className={`transition-all duration-700 ${
                  formStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full group overflow-hidden rounded-xl py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
                    backgroundSize: '200% 200%',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundPosition = '100% 100%';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundPosition = '0% 0%';
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Starting Engine...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                        <span>Enter</span>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>

          

         
          </div>

          {/* Footer */}
          <div
            className={`text-center mt-6 sm:mt-8 transition-all duration-1000 delay-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Secured with end-to-end encryption
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] sm:text-xs text-slate-500">Billing System Online</span>
              <span className="text-slate-700 mx-1">•</span>
              <span className="text-[10px] sm:text-xs text-slate-500">All Bays Active</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}