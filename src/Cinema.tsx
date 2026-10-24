import React, {useEffect, useRef, useState} from 'react';
import {ArrowDown, ArrowUpRight, Bell, Check, Pause, Play, ScanLine, ShieldCheck} from 'lucide-react';
import './cinema.css';

export function useCinemaMotion() {
  const [paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setPaused(media.matches);
    media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    document.documentElement.classList.toggle('motion-paused',paused);
    return ()=>document.documentElement.classList.remove('motion-paused');
  },[paused]);
  return {paused,setPaused};
}
export function CinematicHero({paused,onPause}:{paused:boolean;onPause:()=>void}) {
  const node=useRef<HTMLElement>(null);
  useEffect(()=>{
    const el=node.current;
    if(!el||paused)return;
    let frame=0;
    const draw=()=>{
      frame=0;
      const top=el.getBoundingClientRect().top;
      if(top < -el.offsetHeight || top>window.innerHeight)return;
      el.style.setProperty('--travel',`${Math.max(0,-top)*.16}px`);
    };
    const scroll=()=>{if(!frame)frame=requestAnimationFrame(draw);};
    window.addEventListener('scroll',scroll,{passive:true});draw();
    return ()=>{window.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);el.style.removeProperty('--travel');};
  },[paused]);
  return <section ref={node} className="cinema-hero" aria-label="TextMe für dein Fahrzeug">
    <div className="cinema-camera" aria-hidden="true"><picture>
      <source media="(max-width: 600px)" srcSet="/images/night-drive-mobile.webp"/>
      <img className="cinema-photo" src="/images/night-drive.webp" width="1672" height="941" alt="" fetchPriority="high"/>
    </picture></div>
    <div className="cinema-shade"/><div className="cinema-haze" aria-hidden="true"/>
    <div className="cinema-reticle" aria-hidden="true"><span/><span/><span/><span/></div>
    <div className="container cinema-content">
      <div className="cinema-overline"><i/> VERBUNDEN. AUF DEINE ART.</div>
      <h1><span>DEIN AUTO.</span><span>DEIN MOMENT.</span><span className="cinema-outline">DEINE PRIVATSPHÄRE.</span></h1>
      <div className="cinema-intro"><p>Ein Scan verbindet.<br/>Deine Nummer bleibt bei dir.</p><a className="btn cinema-cta" href="/app">Jetzt QR-Code erstellen <ArrowUpRight size={21}/></a></div>
      <div className="cinema-assurance"><ShieldCheck size={15}/> Ohne öffentliche Kontaktdaten. Ohne App.</div>
    </div>
    <div className="cinema-notice" aria-label="Beispielhinweis"><div className="cinema-notice-head"><span className="cinema-notice-symbol"><Bell size={19}/></span><span>TEXTME<span>BEISPIELHINWEIS</span></span><i/></div><strong>Hey. Dein Licht ist noch an.</strong><span>Ein kleiner Hinweis. Ein gutes Gefühl.</span><div className="cinema-notice-foot"><Check size={13}/> Privat im Postfach</div></div>
    <div className="container cinema-bottom"><a href="#film" className="discover"><span className="scroll-track"><i/></span> DIE IDEE ENTDECKEN <ArrowDown size={14}/></a><span className="cinema-edition">01 <i/> NIGHT CONNECTION</span><button className="motion-toggle" onClick={onPause} aria-pressed={paused} aria-label={paused?'Animationen starten':'Animationen pausieren'}>{paused?<Play size={15}/>:<Pause size={15}/>}<span>{paused?'Bewegung starten':'Bewegung pausieren'}</span></button></div>
  </section>;
}
const chapters=[
  {number:'01',tag:'AUFMERKSAM SEIN',title:<>Ein Licht.<br/>Ein guter Grund.</>,copy:'Licht angelassen? Fenster offen? Manchmal macht ein kleiner Hinweis den ganzen Unterschied.',icon:Bell},
  {number:'02',tag:'EINFACH VERBINDEN',title:<>Ein Scan.<br/>Keine Umwege.</>,copy:'Kamera öffnen, QR scannen und den passenden Hinweis senden. Ohne App und ohne Anmeldung.',icon:ScanLine},
  {number:'03',tag:'PRIVAT BLEIBEN',title:<>Du bist erreichbar.<br/>Deine Nummer nicht.</>,copy:'Die Nachricht landet in deinem TextMe Postfach. Deine persönlichen Kontaktdaten bleiben unsichtbar.',icon:ShieldCheck}
];
export function CinemaStory({paused}:{paused:boolean}) {
  const ref=useRef<HTMLElement>(null);
  const [active,setActive]=useState(0);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    if(paused){setActive(0);return;}
    let frame=0;
    const update=()=>{
      frame=0;const rect=el.getBoundingClientRect();
      if(rect.top>innerHeight||rect.bottom<0)return;
      const p=Math.min(1,Math.max(0,-rect.top/Math.max(1,el.offsetHeight-innerHeight)));
      el.style.setProperty('--story-progress',String(p));
      setActive(Math.min(2,Math.floor(p*3)));
    };
    const scroll=()=>{if(!frame)frame=requestAnimationFrame(update);};
    window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);update();
    return ()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);cancelAnimationFrame(frame);};
  },[paused]);
  const select=(index:number)=>{
    setActive(index);
    if(paused)return;
    const el=ref.current;if(!el)return;
    const start=el.getBoundingClientRect().top+window.scrollY;
    window.scrollTo({top:start+(el.offsetHeight-innerHeight)*(index/3+.08),behavior:'smooth'});
  };
  const Icon=chapters[active].icon;
  return <section className="cinema-story" id="film" ref={ref} aria-label="So verbindet TextMe">
    <div className="story-stage" data-chapter={active}>
      <picture className="story-photo story-detail" aria-hidden="true"><source media="(max-width:600px)" srcSet="/images/signal-detail-mobile.webp"/><img src="/images/signal-detail.webp" alt="" width="1672" height="941" loading="lazy"/></picture>
      <picture className="story-photo story-wide" aria-hidden="true"><source media="(max-width:600px)" srcSet="/images/night-drive-mobile.webp"/><img src="/images/night-drive.webp" alt="" width="1672" height="941" loading="lazy"/></picture>
      <div className="story-shade"/>
      <div className="container story-inner"><div className="story-top"><span>JEDER HINWEIS ZÄHLT.</span><span>TEXTME / {chapters[active].number}</span></div>
        <div className="story-caption" key={active}><span className="story-label"><Icon size={18}/>{chapters[active].tag}</span><h2>{chapters[active].title}</h2><p>{chapters[active].copy}</p></div>
        <div className="story-chapters" role="group" aria-label="Filmszene auswählen">{chapters.map((c,i)=><button key={c.number} type="button" onClick={()=>select(i)} aria-pressed={active===i}><span>{c.number}</span><strong>{c.tag}</strong><i/></button>)}</div>
      </div>
      <div className="story-scan" aria-hidden="true"><ScanLine size={90} strokeWidth={.8}/><span>SCAN. SEND. CONNECT.</span></div>
    </div>
  </section>;
}
export function useScrollReveals() {
  useEffect(()=>{
    if(!('IntersectionObserver' in window))return;
    const nodes=document.querySelectorAll('.section-heading,.step-card,.benefit-item,.faq-layout,.last-cta-inner,.banner-content');
    const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('cinema-entered');observer.unobserve(e.target);}});},{threshold:.14});
    nodes.forEach(node=>observer.observe(node));return ()=>observer.disconnect();
  },[]);
}
