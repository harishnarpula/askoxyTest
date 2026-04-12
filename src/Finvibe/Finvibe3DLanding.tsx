import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ── Utility
const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

// ── Types
interface Particle {
  x: number; y: number; r: number; dx: number; dy: number;
  color: string; alpha: number;
}
interface StatItem { number: string; label: string; }
interface CategoryItem { name: string; stats: StatItem[]; }
interface SectionCardProps {
  side: "left" | "right"; title: string; description: string;
  stats?: StatItem[]; categories?: CategoryItem[];
  ctaLabel: string; ctaColor: string; icon: string;
  onCta: () => void;
}
interface AnimCounterProps { target: number; suffix?: string; duration?: number; }
interface TiltCardProps { children: React.ReactNode; style?: React.CSSProperties; }
interface NavbarProps { activeSection: string; setActiveSection: (s: string) => void; }
interface RoadmapStep {
  num: string; icon: string; title: string; desc: string;
  color: string; bg: string; border: string; tag: string;
}

// ── Roadmap Data (11 steps)
const ROADMAP_STEPS: RoadmapStep[] = [
  { num:"01", icon:"🔍", title:"Planning",        desc:"Defines domain, actors, and core objectives from your prompt.",     color:"#3B6FFF", bg:"#EEF3FF", border:"#C7D8FF", tag:"Analysis" },
  { num:"02", icon:"🛠️", title:"Tech Stack",      desc:"Picks optimal backend, frontend, database, and infra layers.",      color:"#7C3AED", bg:"#F3EEFF", border:"#DDD6FE", tag:"Architecture" },
  { num:"03", icon:"📋", title:"Use Cases",        desc:"Enumerates every user story and functional flow.",                  color:"#0EA5E9", bg:"#EDF7FF", border:"#BAE6FD", tag:"Requirements" },
  { num:"04", icon:"📜", title:"Compliance",       desc:"Applies RBI, KYC/AML, GDPR, PCI-DSS rules automatically.",        color:"#D97706", bg:"#FFFBEB", border:"#FDE68A", tag:"Regulatory" },
  { num:"05", icon:"🏗️", title:"System Design",   desc:"Architects modules, APIs, and service boundaries at scale.",       color:"#059669", bg:"#ECFDF5", border:"#A7F3D0", tag:"Design" },
  { num:"06", icon:"📁", title:"Folder Structure", desc:"Generates a production-grade directory and file layout.",          color:"#0891B2", bg:"#ECFEFF", border:"#A5F3FC", tag:"Scaffolding" },
  { num:"07", icon:"✍️", title:"Prompt Builder",  desc:"Compiles a precise generation prompt from all prior context.",     color:"#9333EA", bg:"#FDF4FF", border:"#E9D5FF", tag:"Synthesis" },
  { num:"08", icon:"⚙️", title:"Backend",         desc:"Generates controllers, services, models, routes, middleware.",     color:"#DC2626", bg:"#FEF2F2", border:"#FECACA", tag:"Code Gen" },
  { num:"09", icon:"🎨", title:"Frontend",         desc:"Builds UI components, pages, state, and API hooks.",              color:"#EA580C", bg:"#FFF7ED", border:"#FED7AA", tag:"Code Gen" },
  { num:"10", icon:"🗄️", title:"Database",        desc:"Writes schemas, migrations, seed data, and query optimisations.", color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0", tag:"Code Gen" },
  { num:"11", icon:"🔬", title:"Validation",       desc:"Audits the full output for errors, gaps, and security issues.",   color:"#475569", bg:"#F4F6FA", border:"#D1D9E8", tag:"Quality" },
];

const ROW1 = ROADMAP_STEPS.slice(0, 6);
const ROW2 = ROADMAP_STEPS.slice(6);

// ── Greeting Speech
function useGreetingSpeech() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const hour = new Date().getHours();
   
    const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const greet = () => {
      const voices = window.speechSynthesis.getVoices();
      const female = voices.find(v =>
        /female|woman|girl|zira|samantha|victoria|karen|moira|tessa|fiona|veena|susan|catherine/i.test(v.name)
      ) || voices.find(v => v.name.toLowerCase().includes("google uk english female"))
        || voices.find(v => /en/i.test(v.lang) && v.name.toLowerCase().includes("female"))
        || voices[0];
      const msg = new SpeechSynthesisUtterance(
        `${timeGreet}! Welcome to OXYBFS dot AI — your intelligent platform for Banking and Insurance. Powered by AI, built for the future.`
      );
      if (female) msg.voice = female;
      msg.rate = 0.95;
      msg.pitch = 1.1;
      msg.volume = 1;
      msg.onstart = () => setSpeaking(true);
      msg.onend = () => setSpeaking(false);
      msg.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(msg);
    };
    if (window.speechSynthesis.getVoices().length) {
      greet();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", greet, { once: true });
    }
    return () => { window.speechSynthesis.cancel(); setSpeaking(false); };
  }, []);
  return speaking;
}

function useForceBodyDark() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.background;
    document.body.style.background = "#020414";
    document.body.style.margin = "0";
    const root = document.getElementById("root");
    if (root) {
      root.style.background = "#020414";
      root.style.minHeight = "100vh";
    }
    return () => { document.body.style.background = prev; };
  }, []);
}

// ── Particle Canvas
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let W = 0, H = 0, animId = 0;
    const COLORS = ["#00f5ff","#7c3aed","#2563eb","#06b6d4","#a855f7"];
    const particles: Particle[] = Array.from({length: 90}, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.4, dx: (Math.random() - .5) * .35, dy: (Math.random() - .5) * .35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)], alpha: Math.random() * .5 + .15,
    }));
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8; ctx.shadowColor = p.color; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > W) p.dx *= -1;
        if (p.y < 0 || p.y > H) p.dy *= -1;
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,245,255,${.07 * (1 - d / 90)})`; ctx.lineWidth = .5; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}} />;
}

// ── Tilt Card
function TiltCard({ children, style = {} }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1) * -10;
    const ry = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1) * 10;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.03,1.03,1.03)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
  };
  return <div ref={ref} style={{transition:"transform 0.15s ease",willChange:"transform",...style}} onMouseMove={onMove} onMouseLeave={onLeave}>{children}</div>;
}

// ── Animated Counter
function AnimCounter({ target, suffix = "", duration = 1800 }: AnimCounterProps) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let v = 0; const step = Math.ceil(target / (duration / 16));
        const t = setInterval(() => { v += step; if (v >= target) { setVal(target); clearInterval(t); } else setVal(v); }, 16);
        obs.disconnect();
      }
    }, {threshold: .5});
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Brain Hero
function BrainHero({ speaking = false }: { speaking?: boolean }) {
  const orbitColors = speaking
    ? ["#ff6b6b","#ffd700","#00f5ff","#a855f7"]
    : ["#00f5ff","#00f5ff","#a855f7","#a855f7"];
  const nucleusGlow = speaking
    ? "0 0 50px rgba(255,107,107,.5),inset 0 0 35px rgba(255,215,0,.3)"
    : "0 0 50px rgba(0,245,255,.35),inset 0 0 35px rgba(124,58,237,.3)";
  const nucleusBg = speaking
    ? "radial-gradient(circle,rgba(255,107,107,.5) 0%,rgba(255,215,0,.15) 70%,transparent 100%)"
    : "radial-gradient(circle,rgba(124,58,237,.45) 0%,rgba(0,245,255,.12) 70%,transparent 100%)";
  const ringColor = speaking ? "rgba(255,215,0," : "rgba(0,245,255,";
  return (
    <div style={{position:"relative",width:300,height:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {[1,2,3].map(i => (
        <div key={i} style={{position:"absolute",width:200+i*46,height:200+i*46,borderRadius:"50%",
          border:`1px solid ${ringColor}${.14-i*.04})`,
          transition:"border-color .4s",
          animation:`spin ${8+i*4}s linear infinite ${i%2===0?"reverse":""}`,}} />
      ))}
      <div style={{width:160,height:160,borderRadius:"50%",
        background:nucleusBg,
        boxShadow:nucleusGlow,
        transition:"background .4s,box-shadow .4s",
        display:"flex",alignItems:"center",justifyContent:"center",
        animation:"float 3s ease-in-out infinite",border:`1px solid ${speaking?"rgba(255,215,0,.4)":"rgba(0,245,255,.3)"}`}}>
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <path d="M50 15C35 15 25 26 25 38C25 44 27 50 31 54C28 57 26 62 26 68C26 78 34 85 44 85C46 85 48 85 50 84V85H52C54 85 56 85 57 84C67 84 74 77 74 68C74 62 72 57 69 54C73 50 75 44 75 38C75 26 65 15 50 15Z" fill="url(#bgr)" opacity=".9"/>
          <path d="M38 40C38 40 42 36 50 36C58 36 62 40 62 40" stroke={speaking?"rgba(255,215,0,.9)":"rgba(0,245,255,.8)"} strokeWidth="2" strokeLinecap="round"/>
          <path d="M35 52C35 52 40 48 50 48C60 48 65 52 65 52" stroke={speaking?"rgba(255,107,107,.7)":"rgba(0,245,255,.6)"} strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="50" cy="60" r="4" fill={speaking?"rgba(255,215,0,.9)":"rgba(0,245,255,.9)"}/>
          {[0,60,120,180,240,300].map((a,i) => (
            <circle key={i} cx={50+20*Math.cos(a*Math.PI/180)} cy={60+20*Math.sin(a*Math.PI/180)} r="2.5"
              fill={speaking?(i%2===0?"rgba(255,107,107,.9)":"rgba(255,215,0,.9)"):"rgba(167,139,250,.9)"}/>
          ))}
          <defs>
            <linearGradient id="bgr" x1="25" y1="15" x2="75" y2="85">
              <stop offset="0%" stopColor={speaking?"#ff6b6b":"#7c3aed"} stopOpacity=".8"/>
              <stop offset="100%" stopColor={speaking?"#ffd700":"#00f5ff"} stopOpacity=".6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      {[0,90,180,270].map((deg,i) => (
        <div key={i} style={{position:"absolute",width:7,height:7,borderRadius:"50%",
          background:orbitColors[i],
          boxShadow:`0 0 ${speaking?12:8}px ${orbitColors[i]}`,
          transition:"background .4s,box-shadow .4s",
          transform:`rotate(${deg}deg) translateX(118px)`,animation:"orbit 6s linear infinite",animationDelay:`${-i*1.5}s`}}/>
      ))}
    </div>
  );
}

// ── Stat Badge
function StatBadge({number, label, color="#00f5ff"}: {number:string; label:string; color?:string}) {
  const num = parseInt(number); const suffix = number.replace(/\d/g, "");
  return (
    <div style={{background:"rgba(255,255,255,.05)",border:`1px solid ${color}40`,borderRadius:14,padding:"16px 20px",
      backdropFilter:"blur(12px)",textAlign:"center",minWidth:128}}>
      <div style={{fontSize:"1.8rem",fontWeight:800,fontFamily:"'Orbitron',monospace",color,textShadow:`0 0 18px ${color}`}}>
        <AnimCounter target={num} suffix={suffix}/>
      </div>
      <div style={{fontSize:".72rem",color:"rgba(255,255,255,.55)",marginTop:4,letterSpacing:".08em"}}>{label}</div>
    </div>
  );
}

// ── Section Card
function SectionCard({side,title,description,stats,categories,ctaLabel,ctaColor,icon,onCta}: SectionCardProps) {
  const isLeft = side === "left";
  return (
    <TiltCard style={{flex:1,minWidth:0}}>
      <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${ctaColor}28`,borderRadius:24,
        padding:"36px 32px",height:"100%",backdropFilter:"blur(20px)",
        boxShadow:`0 8px 50px ${ctaColor}12,inset 0 1px 0 rgba(255,255,255,.07)`,
        position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",gap:20}}>
        <div style={{position:"absolute",top:-70,[isLeft?"left":"right"]:-70,width:180,height:180,borderRadius:"50%",
          background:`radial-gradient(circle,${ctaColor}18 0%,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:56,height:56,borderRadius:14,background:`linear-gradient(135deg,${ctaColor}28,${ctaColor}0a)`,
            border:`1px solid ${ctaColor}38`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",flexShrink:0}}>{icon}</div>
          <div>
            <div style={{fontSize:".68rem",letterSpacing:".2em",color:ctaColor,textTransform:"uppercase",marginBottom:6,fontFamily:"'Orbitron',monospace"}}>
              {isLeft?"Banking":"Insurance"} · AI Platform
            </div>
            <h2 style={{fontSize:"1.6rem",fontWeight:800,color:"#fff",fontFamily:"'Orbitron',monospace",margin:0}}>{title}</h2>
          </div>
        </div>
        <p style={{color:"rgba(255,255,255,.6)",fontSize:".88rem",lineHeight:1.72,margin:0}}>{description}</p>
        {stats && <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{stats.map((s,i) => <StatBadge key={i} number={s.number} label={s.label} color={ctaColor}/>)}</div>}
        {categories && <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {categories.map((cat,i) => (
            <div key={i} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 16px"}}>
              <div style={{color:ctaColor,fontWeight:700,fontSize:".82rem",fontFamily:"'Orbitron',monospace",marginBottom:7}}>{cat.name}</div>
              <div style={{display:"flex",gap:8}}>{cat.stats.map((s,j) => (
                <div key={j} style={{background:`${ctaColor}12`,borderRadius:8,padding:"5px 10px",fontSize:".75rem",color:"rgba(255,255,255,.82)",border:`1px solid ${ctaColor}22`}}>
                  <span style={{color:ctaColor,fontWeight:700}}>{s.number}</span> {s.label}
                </div>
              ))}</div>
            </div>
          ))}
        </div>}
        <button
          onClick={onCta}
          style={{marginTop:"auto",padding:"12px 28px",borderRadius:12,border:`1px solid ${ctaColor}55`,
            background:`linear-gradient(135deg,${ctaColor}18,${ctaColor}05)`,color:ctaColor,
            fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:".82rem",letterSpacing:".1em",
            cursor:"pointer",transition:"all .3s",alignSelf:"flex-start"}}
          onMouseEnter={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${ctaColor}38,${ctaColor}12)`;e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${ctaColor}18,${ctaColor}05)`;e.currentTarget.style.transform="translateY(0)";}}>
          {ctaLabel} →
        </button>
      </div>
    </TiltCard>
  );
}

// ── Navbar
function Navbar({activeSection, setActiveSection}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
   const navigate =useNavigate()
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,padding:"0 40px",height:68,
      display:"flex",alignItems:"center",justifyContent:"space-between",
      background:scrolled?"rgba(2,4,20,.92)":"transparent",backdropFilter:scrolled?"blur(20px)":"none",
      borderBottom:scrolled?"1px solid rgba(0,245,255,.1)":"none",transition:"all .3s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#00f5ff,#7c3aed)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:".95rem"}}>⬡</div>
        <span style={{fontFamily:"'Orbitron',monospace",fontWeight:800,fontSize:"1rem",
          background:"linear-gradient(90deg,#00f5ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>OXYBFS{`{AI}`}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:28}}>
        {["Home"].map(item => (
          <a key={item} href="http://www.askoxy.ai" style={{color:"rgba(255,255,255,.65)",textDecoration:"none",fontSize:".8rem",
            letterSpacing:".08em",fontFamily:"'Orbitron',monospace",fontWeight:500,transition:"color .2s"}}
            onMouseEnter={e=>(e.currentTarget.style.color="#00f5ff")}
            onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.65)")}>{item}</a>
        ))}
      </div>
  <div style={{display:"flex",gap:10}}>
  {([
    {label:"Banking",color:"#00f5ff"},
    {label:"Insurance",color:"#a855f7"}
  ] as {label:string;color:string}[]).map(btn => (
    <button
      key={btn.label}
      onClick={() => {
        const section = btn.label.toLowerCase();
        setActiveSection(section);

        if (section === "banking") {
          navigate("/finvibe-code-builder", { state: { mode: "banking" } });
        } else if (section === "insurance") {
          navigate("/insurvibe-code-builder", { state: { mode: "insurance" } });
        }
      }}
      style={{
        padding:"7px 18px",
        borderRadius:8,
        border:`1px solid ${btn.color}48`,
        cursor:"pointer",
        background:activeSection===btn.label.toLowerCase()
          ? `linear-gradient(135deg,${btn.color}28,${btn.color}0a)`
          : "transparent",
        color:btn.color,
        fontFamily:"'Orbitron',monospace",
        fontWeight:700,
        fontSize:".72rem",
        transition:"all .3s"
      }}
    >
      {btn.label}
    </button>
  ))}
</div>
    </nav>
  );
}

// ══════════════════════════════════════════════
// ROADMAP — Clean dark design with ROADMAP_STEPS
// ══════════════════════════════════════════════

function StepCard({s, delay=0}: {s: RoadmapStep; delay?: number}) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{flex:1,minWidth:0,animationDelay:`${delay}s`}}>
      <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{background:hov?`${s.color}12`:"rgba(255,255,255,.03)",
          border:`1px solid ${hov?s.color+"60":s.color+"22"}`,borderRadius:14,padding:"16px 14px",
          transition:"all .22s",cursor:"default",position:"relative",overflow:"hidden",height:"100%",
          boxShadow:hov?`0 6px 24px ${s.color}20`:"none"}}>
        {/* Step number badge */}
        <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
          width:26,height:26,borderRadius:8,background:`${s.color}20`,border:`1px solid ${s.color}40`,
          fontSize:"0.7rem",fontWeight:700,color:s.color,marginBottom:10,fontFamily:"sans-serif"}}>  
          {s.num}
        </div>
        {/* Icon */}
        <div style={{fontSize:"1.4rem",marginBottom:8,lineHeight:1}}>{s.icon}</div>
        {/* Tag */}
        <span style={{fontSize:"0.65rem",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",
          padding:"2px 8px",borderRadius:4,background:`${s.color}18`,color:s.color,border:`1px solid ${s.color}30`,
          display:"inline-block",marginBottom:8,fontFamily:"sans-serif"}}>{s.tag}</span>
        {/* Title */}
        <div style={{fontFamily:"sans-serif",fontWeight:700,fontSize:"0.85rem",
          color:hov?"#fff":"rgba(255,255,255,.9)",marginBottom:6,lineHeight:1.3}}>{s.title}</div>
        {/* Desc */}
        <p style={{fontSize:"0.75rem",color:"rgba(255,255,255,.55)",lineHeight:1.6,margin:0,fontFamily:"sans-serif"}}>{s.desc}</p>
        {/* Bottom bar */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
          background:`linear-gradient(90deg,transparent,${s.color}${hov?"99":"30"},transparent)`,transition:"all .25s"}}/>
      </div>
    </div>
  );
}

function ChevronArrow({color}: {color: string}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,width:24,padding:"0 1px"}}>
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
        <path d="M1 6H14M14 6L9 1M14 6L9 11" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity=".65"/>
      </svg>
    </div>
  );
}

function SnakeBend({fromColor, toColor}: {fromColor: string; toColor: string}) {
  return (
    <div style={{display:"flex",justifyContent:"flex-end",paddingRight:10,height:36,margin:"2px 0"}}>
      <svg width="52" height="36" viewBox="0 0 52 36" fill="none" overflow="visible">
        <defs>
          <linearGradient id="snk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fromColor} stopOpacity=".5"/>
            <stop offset="100%" stopColor={toColor} stopOpacity=".5"/>
          </linearGradient>
        </defs>
        <path d="M 5 3 Q 47 3 47 18 Q 47 33 5 33" stroke="url(#snk)" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        <path d="M 10 27 L 4 33 L 10 39" stroke={toColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity=".6"/>
      </svg>
    </div>
  );
}

// ── Roadmap Section (inline, no modal)
function RoadmapSection() {
  return (
    <section style={{position:"relative",zIndex:2,padding:"80px 40px 60px"}}>
      <div style={{position:"absolute",inset:0,zIndex:-1,
        background:"radial-gradient(ellipse 70% 50% at 50% 50%,rgba(59,111,255,.06) 0%,transparent 70%)"}}/>
      <div style={{maxWidth:1080,margin:"0 auto"}}>

        {/* Heading */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(0,245,255,.07)",
            border:"1px solid rgba(0,245,255,.18)",borderRadius:100,padding:"3px 14px",marginBottom:12}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#00f5ff",display:"inline-block",animation:"rdmPulse 1.6s ease-in-out infinite"}}/>
            <span style={{fontSize:"0.7rem",fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"#00f5ff",fontFamily:"sans-serif"}}>AI Generation Pipeline</span>
          </div>
          <h2 style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(1.3rem,3vw,2rem)",fontWeight:800,
            background:"linear-gradient(90deg,#00f5ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:10}}>
            How OXYBFS.AI Works
          </h2>
          <p style={{color:"rgba(255,255,255,.38)",fontSize:".85rem",maxWidth:460,margin:"0 auto",lineHeight:1.7}}>
            11 sequential AI stages · Each feeds directly into the next · Done in under 60 seconds
          </p>
        </div>

        {/* Track A */}
        <div style={{fontSize:"0.7rem",letterSpacing:".12em",textTransform:"uppercase",
          color:"rgba(255,255,255,.35)",fontFamily:"sans-serif",fontWeight:600,marginBottom:12}}>
          ◆ Track A — Foundation &amp; Architecture (Steps 01–06)
        </div>
        <div style={{display:"flex",alignItems:"stretch",gap:0,marginBottom:0}}>
          {ROW1.map((s,i) => (
            <div key={s.num} style={{display:"flex",alignItems:"center",flex:1,minWidth:0}}>
              <StepCard s={s} delay={i*.05}/>
              {i < ROW1.length-1 && <ChevronArrow color={ROW1[i+1].color}/>}
            </div>
          ))}
        </div>

        <SnakeBend fromColor={ROW1[ROW1.length-1].color} toColor={ROW2[0].color}/>

        {/* Track B */}
        <div style={{fontSize:"0.7rem",letterSpacing:".12em",textTransform:"uppercase",
          color:"rgba(255,255,255,.35)",fontFamily:"sans-serif",fontWeight:600,marginBottom:12}}>
          ◆ Track B — Generation &amp; Validation (Steps 07–11)
        </div>
        <div style={{display:"flex",alignItems:"stretch",gap:0,marginBottom:24}}>
          {ROW2.map((s,i) => (
            <div key={s.num} style={{display:"flex",alignItems:"center",flex:1,minWidth:0}}>
              <StepCard s={s} delay={i*.05+.3}/>
              {i < ROW2.length-1 && <ChevronArrow color={ROW2[i+1].color}/>}
            </div>
          ))}
          <ChevronArrow color="#00f5ff"/>
          <div style={{flexShrink:0,display:"flex",alignItems:"center"}}>
            <div style={{background:"linear-gradient(135deg,rgba(0,245,255,.1),rgba(124,58,237,.12))",
              border:"1px solid rgba(0,245,255,.28)",borderRadius:14,padding:"14px 16px",textAlign:"center",
              minWidth:90,boxShadow:"0 0 24px rgba(0,245,255,.1)"}}>
              <div style={{fontSize:"1.6rem",marginBottom:6}}>🚀</div>
              <div style={{fontFamily:"sans-serif",fontSize:"0.8rem",fontWeight:700,color:"#00f5ff",marginBottom:3}}>App Ready!</div>
              <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.45)",lineHeight:1.5,fontFamily:"sans-serif"}}>Full stack<br/>in &lt;60s</div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{padding:"12px 16px",background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.06)",
          borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <span style={{fontSize:16}}>⚡</span>
            <div>
              <p style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,.85)",margin:"0 0 2px",fontFamily:"sans-serif"}}>
                All 11 stages complete in under 60 seconds
              </p>
              <p style={{fontSize:"0.75rem",color:"rgba(255,255,255,.45)",margin:0,fontFamily:"sans-serif"}}>
                Every stage streams live — watch your app materialise token by token.
              </p>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {([["Analysis","#3B6FFF"],["Architecture","#7C3AED"],["Code Gen","#DC2626"],["Quality","#475569"]] as [string,string][]).map(([t,c]) => (
              <span key={t} style={{fontSize:"0.7rem",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",
                padding:"3px 10px",borderRadius:5,background:`${c}15`,color:c,border:`1px solid ${c}30`,fontFamily:"sans-serif"}}>{t}</span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("banking");
  useForceBodyDark();
  const speaking = useGreetingSpeech();
   const navigate =useNavigate()

  return (
    <div style={{background:"#020414",minHeight:"100vh",color:"#fff",fontFamily:"'Sora',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;800;900&family=Sora:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; background: #020414; }
        body { background: #020414 !important; }
        #root { background: #020414; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020414; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(#00f5ff,#7c3aed); border-radius: 2px; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes orbit { from{transform:rotate(0deg) translateX(118px)} to{transform:rotate(360deg) translateX(118px)} }
        @keyframes pulseGlow { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes rdmPulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes voiceColor {
          0%   { background-position: 0% center }
          25%  { background-position: 50% center }
          50%  { background-position: 100% center }
          75%  { background-position: 50% center }
          100% { background-position: 0% center }
        }
      `}</style>

      <ParticleCanvas/>
      {/* scanline */}
      <div style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.022) 2px,rgba(0,0,0,.022) 4px)"}}/>

      <Navbar activeSection={activeSection} setActiveSection={setActiveSection}/>

      <section style={{position:"relative",zIndex:2,minHeight:"60vh",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"80px 40px 40px",textAlign:"center",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,zIndex:-1,
          background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(124,58,237,.14) 0%,transparent 70%),radial-gradient(ellipse 60% 40% at 20% 100%,rgba(0,245,255,.07) 0%,transparent 60%)"}}/>

        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,245,255,.07)",
          border:"1px solid rgba(0,245,255,.22)",borderRadius:100,padding:"4px 14px",marginBottom:16,
          animation:"fadeInUp .8s ease forwards",backdropFilter:"blur(10px)"}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:"#00f5ff",animation:"pulseGlow 2s infinite"}}/>
          <span style={{fontSize:".62rem",letterSpacing:".12em",color:"#00f5ff",fontFamily:"'Orbitron',monospace"}}>AI-POWERED FINTECH PLATFORM</span>
        </div>

        <h1 style={{fontSize:"clamp(1.8rem,5vw,3.8rem)",fontFamily:"'Orbitron',monospace",fontWeight:900,lineHeight:1.05,marginBottom:10,letterSpacing:"-.02em",animation:"fadeInUp .8s ease .12s both"}}>
          <span style={{
            backgroundImage:"linear-gradient(135deg,#ffffff 0%,#00f5ff 40%,#a855f7 70%,#ffffff 100%)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
            display:"inline-block",
            animation:"shimmer 4s linear 1s infinite",
          }}>OXYBFS&#123;AI&#125;</span>
        </h1>

        <h2 style={{fontSize:"clamp(1rem,2vw,1.5rem)",fontFamily:"'Orbitron',monospace",fontWeight:700,
          background:"linear-gradient(90deg,#00f5ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          marginBottom:14,animation:"fadeInUp .8s ease .2s both",letterSpacing:".02em"}}>Vibe Code</h2>

        <p style={{fontSize:"clamp(.8rem,1.5vw,.95rem)",color:"rgba(255,255,255,.55)",maxWidth:500,lineHeight:1.65,
          marginBottom:28,animation:"fadeInUp .8s ease .3s both",fontWeight:300}}>
          Transforming <span style={{color:"#00f5ff",fontWeight:600}}>Banking</span> &amp; <span style={{color:"#a855f7",fontWeight:600}}>Insurance</span> with Intelligent AI Systems
        </p>

        <div style={{animation:"fadeInUp .8s ease .44s both",transform:"scale(0.72)",transformOrigin:"center top",marginBottom:-30}}><BrainHero speaking={speaking}/></div>

        <div style={{marginTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:6,animation:"fadeInUp .8s ease .58s both"}}>
          <div style={{fontSize:".58rem",letterSpacing:".2em",color:"rgba(255,255,255,.22)",fontFamily:"'Orbitron',monospace"}}>SCROLL TO EXPLORE</div>
          <div style={{width:18,height:28,border:"1px solid rgba(255,255,255,.16)",borderRadius:9,display:"flex",justifyContent:"center",paddingTop:4}}>
            <div style={{width:2,height:5,borderRadius:2,background:"#00f5ff",animation:"float 1.5s ease-in-out infinite"}}/>
          </div>
        </div>
      </section>

      {/* ── SPLIT */}
      <section style={{position:"relative",zIndex:2,padding:"70px 40px 90px"}}>
        <div style={{textAlign:"center",marginBottom:50}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:".65rem",letterSpacing:".25em",color:"rgba(255,255,255,.22)",textTransform:"uppercase",marginBottom:10}}>Core Intelligence Suite</div>
          <h2 style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(1.4rem,3vw,2.2rem)",fontWeight:800,
            background:"linear-gradient(90deg,#00f5ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Dual Domain Mastery</h2>
        </div>
        <div style={{display:"flex",gap:22,alignItems:"stretch",maxWidth:1080,margin:"0 auto",flexWrap:"wrap"}}>
          <SectionCard side="left" title="Banking Intelligence"
            description="Empowering financial institutions with scalable AI-driven solutions, automation frameworks, and deep analytics — from compliance intelligence to real-time transaction monitoring."
            stats={[{number:"253+",label:"Master Directions"},{number:"51+",label:"Banking Use Cases"}]}
            ctaLabel="Explore Banking" ctaColor="#00f5ff" icon="🏦"
            onCta={() => navigate("/finvibe-code-builder", { state: { mode: "banking" } })}/>
          <SectionCard side="right" title="Insurance Intelligence"
            description="Revolutionizing insurance ecosystems with intelligent product mapping, automation, and real-time insights — from policy lifecycle to claims intelligence and risk scoring."
            categories={[
              {name:"🛡️ Life Insurance",stats:[{number:"28+",label:"Companies"},{number:"2800+",label:"Products"}]},
              {name:"🔒 General Insurance",stats:[{number:"30+",label:"Providers"},{number:"1200+",label:"Products"}]}
            ]}
            ctaLabel="Explore Insurance" ctaColor="#a855f7" icon="🛡️"
            onCta={() => navigate("/insurvibe-code-builder", { state: { mode: "insurance" } })}/>
        </div>
      </section>

      {/* ── STATS */}
      <section style={{position:"relative",zIndex:2,padding:"50px 40px",
        background:"rgba(255,255,255,.018)",borderTop:"1px solid rgba(255,255,255,.05)",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{maxWidth:1050,margin:"0 auto",display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:26}}>
          {([{num:253,suffix:"+",label:"Master Directions",color:"#00f5ff"},{num:51,suffix:"+",label:"Banking Use Cases",color:"#00f5ff"},
             {num:28,suffix:"+",label:"Insurance Companies",color:"#a855f7"},{num:2800,suffix:"+",label:"Insurance Products",color:"#a855f7"},
             {num:99,suffix:"%",label:"AI Accuracy",color:"#22d3ee"}] as {num:number;suffix:string;label:string;color:string}[]).map((s,i) => (
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:"2.5rem",fontWeight:900,fontFamily:"'Orbitron',monospace",color:s.color,textShadow:`0 0 22px ${s.color}`}}>
                <AnimCounter target={s.num} suffix={s.suffix}/>
              </div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:".76rem",marginTop:5,letterSpacing:".08em"}}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROADMAP */}
      <RoadmapSection/>

      {/* ── FEATURES */}
      <section style={{position:"relative",zIndex:2,padding:"80px 40px"}}>
        <div style={{maxWidth:1080,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <h2 style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(1.2rem,3vw,1.9rem)",fontWeight:800,color:"#fff",marginBottom:9}}>Platform Capabilities</h2>
            <p style={{color:"rgba(255,255,255,.38)",fontSize:".85rem",maxWidth:460,margin:"0 auto"}}>Built for enterprise-grade performance with intelligent automation at its core</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(245px,1fr))",gap:16}}>
            {([
              {icon:"🧠",title:"Neural Analytics",desc:"Deep learning models trained on financial and insurance data for predictive intelligence.",color:"#00f5ff"},
              {icon:"⚡",title:"Real-Time Processing",desc:"Sub-millisecond transaction analysis with intelligent anomaly detection at scale.",color:"#7c3aed"},
              {icon:"🔐",title:"Compliance Engine",desc:"253+ master directions mapped and automated for end-to-end regulatory compliance.",color:"#06b6d4"},
              {icon:"📊",title:"Smart Dashboard",desc:"Holographic-grade UI with live KPIs, risk heat maps, and AI-generated insights.",color:"#a855f7"},
              {icon:"🤖",title:"AI Automation",desc:"Intelligent RPA workflows for policy processing, claims routing, and reconciliation.",color:"#00f5ff"},
              {icon:"🌐",title:"API Ecosystem",desc:"Open banking and insurance APIs with real-time webhooks and enterprise integrations.",color:"#7c3aed"},
              {icon:"🧪",title:"Auto Test Cases",desc:"AI generates exhaustive unit, integration, and edge-case test suites from your codebase — zero manual effort.",color:"#10b981"},
              {icon:"🗂️",title:"Auto Test Data",desc:"Synthesises realistic, regulation-compliant test datasets for banking and insurance scenarios on demand.",color:"#f59e0b"},
            ] as {icon:string;title:string;desc:string;color:string}[]).map((feat,i) => (
              <TiltCard key={i}>
                <div style={{background:"rgba(255,255,255,.028)",border:"1px solid rgba(255,255,255,.06)",borderRadius:15,
                  padding:"22px 20px",transition:"border-color .28s,box-shadow .28s",cursor:"default"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=`${feat.color}35`;(e.currentTarget as HTMLDivElement).style.boxShadow=`0 0 22px ${feat.color}10`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(255,255,255,.06)";(e.currentTarget as HTMLDivElement).style.boxShadow="none";}}>
                  <div style={{fontSize:"1.5rem",marginBottom:11}}>{feat.icon}</div>
                  <h3 style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:".85rem",color:feat.color,marginBottom:8,letterSpacing:".03em"}}>{feat.title}</h3>
                  <p style={{color:"rgba(255,255,255,.42)",fontSize:".78rem",lineHeight:1.65}}>{feat.desc}</p>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      <section style={{position:"relative",zIndex:2,padding:"0 40px 60px"}}>
        <div style={{maxWidth:1080,margin:"0 auto"}}>
          <div style={{
            background:"linear-gradient(135deg,rgba(0,245,255,.06) 0%,rgba(124,58,237,.08) 50%,rgba(168,85,247,.06) 100%)",
            border:"1px solid rgba(0,245,255,.18)",
            borderRadius:20,
            padding:"28px 36px",
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:24,
            flexWrap:"wrap" as const,
            boxShadow:"0 0 40px rgba(0,245,255,.06)",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{
                width:48,height:48,borderRadius:13,flexShrink:0,
                background:"linear-gradient(135deg,rgba(0,245,255,.18),rgba(124,58,237,.18))",
                border:"1px solid rgba(0,245,255,.28)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",
              }}>📦</div>
              <div>
                <p style={{fontSize:".68rem",letterSpacing:".16em",textTransform:"uppercase" as const,
                  color:"rgba(0,245,255,.7)",fontFamily:"'Orbitron',monospace",fontWeight:600,margin:"0 0 4px"}}>Community Showcase</p>
                <h3 style={{fontFamily:"'Orbitron',monospace",fontWeight:800,fontSize:"clamp(.95rem,2vw,1.2rem)",
                  color:"#fff",margin:"0 0 5px",letterSpacing:"-.01em"}}>Explore Already Generated Code</h3>
                <p style={{fontSize:".8rem",color:"rgba(255,255,255,.45)",margin:0,lineHeight:1.6,fontFamily:"sans-serif"}}>
                  Browse real BFSI apps built by OXYBFS.AI — full backend, frontend &amp; database code, ready to use.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/bfsi-projects")}
              style={{
                padding:"12px 28px",borderRadius:11,border:"1px solid rgba(0,245,255,.5)",
                background:"linear-gradient(135deg,rgba(0,245,255,.14),rgba(124,58,237,.1))",
                color:"#00f5ff",fontFamily:"'Orbitron',monospace",fontWeight:700,
                fontSize:".78rem",letterSpacing:".08em",cursor:"pointer",
                transition:"all .25s",whiteSpace:"nowrap" as const,flexShrink:0,
                boxShadow:"0 0 20px rgba(0,245,255,.1)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(0,245,255,.28),rgba(124,58,237,.2))";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(0,245,255,.22)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(0,245,255,.14),rgba(124,58,237,.1))";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0,245,255,.1)";
              }}
            >
              Let's Start →
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA */}
      <section style={{position:"relative",zIndex:2,padding:"70px 40px",textAlign:"center",
        background:"linear-gradient(135deg,rgba(0,245,255,.035) 0%,rgba(124,58,237,.06) 50%,rgba(168,85,247,.035) 100%)",
        borderTop:"1px solid rgba(0,245,255,.08)",borderBottom:"1px solid rgba(168,85,247,.08)"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:".65rem",letterSpacing:".2em",color:"rgba(255,255,255,.28)",marginBottom:12}}>BEGIN YOUR TRANSFORMATION</div>
        <h2 style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(1.4rem,4vw,2.7rem)",fontWeight:900,
          background:"linear-gradient(90deg,#00f5ff 0%,#fff 50%,#a855f7 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:16}}>
          Ready to Redefine FinTech?
        </h2>
        <p style={{color:"rgba(255,255,255,.44)",fontSize:".92rem",maxWidth:460,margin:"0 auto 30px",lineHeight:1.72}}>
          Join leading banks and insurers leveraging OXYBFS.AI to build the future of intelligent financial services.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
  {([
    {label:"Get Started with Banking",bg:"transparent",color:"#00f5ff",border:"1px solid rgba(0,245,255,.5)",shadow:"none"},
    {label:"Get Started with Insurance",bg:"transparent",color:"#a855f7",border:"1px solid rgba(168,85,247,.5)",shadow:"none"},
  ] as {label:string;bg:string;color:string;border?:string;shadow:string}[]).map((btn,i) => (
    <button
      key={i}
      style={{
        padding:"13px 30px",
        borderRadius:11,
        background:btn.bg,
        color:btn.color,
        border:btn.border??"none",
        fontFamily:"'Orbitron',monospace",
        fontWeight:700,
        fontSize:".8rem",
        cursor:"pointer",
        boxShadow:btn.shadow,
        letterSpacing:".08em",
        transition:"all .28s"
      }}
      onClick={() => {
        if (btn.label === "Get Started with Banking") {
          navigate("/finvibe-code-builder", { state: { mode: "banking" } });
        } else if (btn.label === "Get Started with Insurance") {
          navigate("/insurvibe-code-builder", { state: { mode: "insurance" } });
        }
      }}
      onMouseEnter={e=>{
        e.currentTarget.style.transform="translateY(-3px) scale(1.02)";
      }}
      onMouseLeave={e=>{
        e.currentTarget.style.transform="translateY(0) scale(1)";
      }}
    >
      {btn.label}
    </button>
  ))}
</div>
      </section>

      {/* ── FOOTER */}
      <footer style={{position:"relative",zIndex:2,padding:"34px 40px 24px",borderTop:"1px solid rgba(255,255,255,.04)"}}>
        <div style={{maxWidth:1050,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#00f5ff,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".78rem"}}>⬡</div>
            <span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:".85rem",background:"linear-gradient(90deg,#00f5ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>OXYBFS.AI</span>
          </div>
          <div style={{color:"rgba(255,255,255,.25)",fontSize:".74rem",letterSpacing:".08em"}}>⚡ Powered by ASKOXY.AI</div>
          {/* <div style={{display:"flex",gap:10}}>
            {["𝕏","in","✉"].map((icon,i) => (
              <div key={i} style={{width:30,height:30,borderRadius:7,border:"1px solid rgba(255,255,255,.09)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:".75rem",color:"rgba(255,255,255,.4)",transition:"all .2s"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.color="#00f5ff";(e.currentTarget as HTMLDivElement).style.borderColor="rgba(0,245,255,.3)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.color="rgba(255,255,255,.4)";(e.currentTarget as HTMLDivElement).style.borderColor="rgba(255,255,255,.09)";}}>
                {icon}
              </div>
            ))}
          </div> */}
        </div>
        <div style={{maxWidth:1050,margin:"16px auto 0",borderTop:"1px solid rgba(255,255,255,.04)",paddingTop:14,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span style={{fontSize:".68rem",color:"rgba(255,255,255,.17)"}}>© 2026 OXYBFS.AI — All rights reserved</span>
          {/* <a href="#" style={{fontSize:".68rem",color:"rgba(255,255,255,.25)",textDecoration:"none"}}>contact@oxybfs.ai</a> */}
        </div>
      </footer>
    </div>
  );
}