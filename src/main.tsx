import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import {
  ArrowRight, ArrowUpRight, Bell, CarFront, Check, CheckCircle2, ChevronDown,
  CircleHelp, Copy, Download, Eye, Fingerprint, Gauge, Inbox, LockKeyhole,
  Mail, Menu, MessageCircle, MoonStar, Plus, Power, QrCode, ScanLine,
  Send, ShieldCheck, Sparkles, Sun, X, Zap
} from 'lucide-react';
import './styles.css';

type Code = { id: string; slug: string; label: string; theme: string; active: number; views: number; created_at?: number; message_count?: number; unread_count?: number };
type Notice = { id: string; reason: string; note: string; is_read: number; emailed: number; created_at: number; vehicle_label: string; slug: string };
type Config = { turnstileSiteKey: string | null; notificationsEnabled: boolean };
type ApiError = Error & { status?: number };
const themes = [
  { id: 'classic_dawn', title: 'Electric Blue', bg: '#1548df', ink: '#ffffff', qr: '#101b46' },
  { id: 'galactic_twilight', title: 'Ultraviolet', bg: '#642acb', ink: '#ffffff', qr: '#241242' },
  { id: 'emerald_canopy', title: 'Signal Red', bg: '#ad193a', ink: '#ffffff', qr: '#3b101b' },
  { id: 'azure_depths', title: 'Midnight', bg: '#122044', ink: '#d4eeff', qr: '#101b38' },
  { id: 'monochic', title: 'Monochic', bg: '#1a1c1b', ink: '#ffffff', qr: '#151515' }
];
const themesById = (id: string) => themes.find(theme => theme.id === id) || themes[0];
const reasons = [
  { id: 'blocked', label: 'Zufahrt blockiert', icon: CarFront },
  { id: 'lights', label: 'Licht ist an', icon: Sun },
  { id: 'window', label: 'Fenster offen', icon: MoonStar },
  { id: 'damage', label: 'Schaden entdeckt', icon: ShieldCheck },
  { id: 'other', label: 'Anderer Hinweis', icon: MessageCircle }
];
const reasonName = (id: string) => reasons.find(item => item.id === id)?.label || 'Hinweis';
const linkFor = (slug: string) => window.location.origin + '/q/' + slug;
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Die Verbindung ist fehlgeschlagen.') as ApiError;
    error.status = response.status;
    throw error;
  }
  return data as T;
}
function Logo({ light = false }: { light?: boolean }) {
  return <a href="/" className={'logo ' + (light ? 'logo-light' : '')} aria-label="TextMe Startseite">textme<span className="logo-dot">.</span><span className="logo-stamp">QR</span></a>;
}
function Nav({ dark = true }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className={'nav ' + (dark ? 'nav-dark' : 'nav-light')}>
    <div className="container nav-inner">
      <Logo light={dark} />
      <nav onClick={() => setOpen(false)} className={open ? 'nav-links is-open' : 'nav-links'} aria-label="Hauptnavigation">
        <a href="/#so-gehts">So funktioniert's</a>
        <a href="/#vorteile">Vorteile</a>
        <a href="/#faq">Fragen</a>
      </nav>
      <a className="nav-action" href="/app">Zum Dashboard <ArrowUpRight size={17}/></a>
      <button className="hamburger" aria-expanded={open} aria-label={open ? 'Menü schließen' : 'Menü öffnen'} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    </div>
  </header>;
}
function Footer() {
  return <footer className="site-footer"><div className="container footer-top">
    <div><Logo light/><p>Dein Auto. Erreichbar. Privat.</p></div>
    <div className="footer-links"><a href="/#so-gehts">So funktioniert's</a><a href="/#faq">FAQ</a><a href="/datenschutz">Datenschutz</a><a href="/impressum">Impressum</a></div>
  </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} TextMe</span><span>Mit Rücksicht unterwegs.</span></div></footer>;
}
function QRVisual({ value, className = '', theme = 'classic_dawn' }: { value: string; className?: string; theme?: string }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: 540, margin: 1, errorCorrectionLevel: 'H',
      color: { dark: themesById(theme).qr, light: '#ffffffff' } })
      .then(url => { if (alive) setSource(url); })
      .catch(() => { if (alive) setSource(''); });
    return () => { alive = false; };
  }, [value, theme]);
  return source ? <img className={'qr-img ' + className} src={source} alt="Dein individueller QR-Code" /> : <div className="qr-loading" aria-label="QR-Code wird erzeugt"><QrCode size={44}/></div>;
}
function ConnectionArt() {
  return <div className="connection-art" aria-label="TextMe QR und beispielhafter Fahrzeughinweis">
    <div className="signal-orbit orbit-a"/><div className="signal-orbit orbit-b"/><div className="signal-orbit orbit-c"/>
    <div className="signal-axis"/><div className="art-coordinate">TEXTME / PRIVATE CONNECTION</div>
    <div className="identity-card"><div className="identity-top"><Logo light/><span>FAHRZEUG ID</span></div>
      <div className="identity-qr"><QRVisual value={window.location.origin} theme="monochic"/><span className="scan-beam"/></div>
      <div className="identity-bottom"><span>Ein Scan. Ein guter Hinweis.</span><ScanLine size={23}/></div>
    </div>
    <div className="signal-notice"><div className="signal-notice-icon"><Bell size={22}/></div><div><small>SO SIEHT EIN HINWEIS AUS</small><strong>Dein Licht ist noch an.</strong><span>Diskret. Direkt in dein Postfach.</span></div><span className="notice-dot"/></div>
    <div className="privacy-chip"><ShieldCheck size={16}/> Deine Nummer bleibt privat</div>
    <div className="art-caption"><span>SCANNEN</span><i/><span>HINWEIS SENDEN</span><i/><span>VERBUNDEN</span></div>
  </div>;
}
function Landing() {
  return <>
    <div className="dark-shell">
      <Nav/>
      <section className="hero"><div className="container hero-layout">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> KLEINER CODE. GROSSER UNTERSCHIED. </div>
          <h1>DEIN AUTO.<br/><span className="heading-light">ERREICHBAR.</span><br/><em>PRIVAT.</em></h1>
          <p className="hero-lede">Ein Scan genügt. Andere können dir Bescheid geben, wenn etwas mit deinem Auto ist. Ohne deine Telefonnummer. Ohne umständliche App.</p>
          <div className="hero-cta"><a className="btn btn-lime" href="/app">Jetzt QR-Code erstellen <ArrowUpRight size={20}/></a><a className="hero-text-link" href="/#so-gehts">So funktioniert's <ArrowRight size={18}/></a></div>
          <div className="hero-trust"><span><ShieldCheck size={17}/> Kontaktdaten bleiben privat</span><span><Zap size={16}/> In Sekunden eingerichtet</span></div>
        </div>
        <div className="hero-visual"><ConnectionArt/></div>
      </div></section>
      <div className="feature-strip"><div className="container strip-inner"><span>KEINE TELEFONNUMMER</span><i/><span>EIN EINFACHER SCAN</span><i/><span>FÜR DEINEN ALLTAG</span><i/><span>DU HAST DIE KONTROLLE</span></div></div>
    </div>
    <section id="so-gehts" className="how-section light-section"><div className="container">
      <div className="section-heading"><div><div className="kicker"><span className="kicker-icon">01</span> DIE IDEE</div><h2>Weniger Aufwand.<br/><span>Mehr Rücksicht.</span></h2></div>
        <p>Parkplatz blockiert? Fenster offen? Licht angelassen? Ein QR-Code macht den kleinen Hinweis ganz einfach.</p></div>
      <div className="steps-grid">
        <div className="step-card"><div className="step-top"><span>01 / ANLEGEN</span><QrCode/></div><div className="step-graphic graphic-code"><div className="graphic-qr"><QRVisual value={window.location.origin}/></div><span className="orbit orbit-1"/><span className="orbit orbit-2"/></div><h3>QR-Code erstellen</h3><p>Einmal mit deiner E-Mail anmelden, Fahrzeug benennen und QR-Code herunterladen.</p></div>
        <div className="step-card"><div className="step-top"><span>02 / ANBRINGEN</span><CarFront/></div><div className="step-graphic graphic-car"><CarFront size={106} strokeWidth={1}/><div className="graphic-sticker"><ScanLine size={23}/></div></div><h3>Sichtbar platzieren</h3><p>Platziere den Code gut sichtbar im Fahrzeug. Auch als digitale Vorlage zum Ausdrucken.</p></div>
        <div className="step-card"><div className="step-top"><span>03 / VERBINDEN</span><Bell/></div><div className="step-graphic graphic-notice"><div className="mini-notice"><div className="mini-icon"><Bell size={19}/></div><div><small>NEUER HINWEIS</small><strong>Dein Licht ist noch an.</strong></div><CheckCircle2 size={22}/></div></div><h3>Hinweis erhalten</h3><p>Andere wählen einen Grund aus. Du siehst die Nachricht in deinem persönlichen Dashboard.</p></div>
      </div>
    </div></section>
    <section id="vorteile" className="benefits-section"><div className="container benefits-layout"><div className="benefits-left"><div className="kicker"><span className="kicker-icon">02</span> WARUM TEXTME?</div><h2>OFFEN FÜR<br/>HINWEISE.<br/><em>GESCHÜTZT.</em></h2><p>Du entscheidest, wann du erreichbar bist. TextMe gibt anderen einen Weg, freundlich auf Dinge aufmerksam zu machen. Nicht mehr, nicht weniger.</p><a className="btn btn-outline" href="/app">Meinen Code erstellen <ArrowUpRight size={18}/></a></div>
      <div className="benefit-list"><div className="benefit-item"><div className="benefit-icon"><Fingerprint/></div><div><h3>Privat von Anfang an</h3><p>Dein Code zeigt weder Telefonnummer noch E-Mail-Adresse. Nur ein einfaches Hinweisformular.</p></div><span>01</span></div><div className="benefit-item"><div className="benefit-icon"><ScanLine/></div><div><h3>Keine App nötig</h3><p>Wer dir einen Hinweis schickt, braucht nur die Smartphone-Kamera.</p></div><span>02</span></div><div className="benefit-item"><div className="benefit-icon"><Gauge/></div><div><h3>Du behältst die Kontrolle</h3><p>Codes umbenennen, mehrere Fahrzeuge verwalten oder einen Code jederzeit pausieren.</p></div><span>03</span></div><div className="benefit-item"><div className="benefit-icon"><LockKeyhole/></div><div><h3>Weniger Spam</h3><p>Begrenzte Nachrichtenhäufigkeit und eine optionale Sicherheitsprüfung schützen die Kontaktfunktion.</p></div><span>04</span></div></div>
    </div></section>
    <section className="banner-section"><div className="container banner-content"><div><div className="kicker">DEIN FAHRZEUG, DEIN CODE</div><h2>MEHR ALS NUR<br/>EIN <em>STICKER.</em></h2><p>Digital starten, später auf hochwertigem Material anbringen. Deine Verbindung bleibt dieselbe.</p><a href="/app" className="btn btn-dark">Kostenlos digital starten <ArrowUpRight size={20}/></a></div><div className="banner-art"><div className="banner-plate"><div className="plate-word">textme<span>.</span></div><div className="plate-qr"><QRVisual value={window.location.origin}/></div><div className="plate-caption">SCANNEN UND HINWEIS SENDEN</div></div><span className="banner-sun"/></div></div></section>
    <section id="faq" className="faq-section light-section"><div className="container faq-layout"><div><div className="kicker"><span className="kicker-icon">03</span> GUT ZU WISSEN</div><h2>NOCH FRAGEN<span className="accent-mark">?</span></h2><p>Die wichtigsten Antworten auf einen Blick.</p></div><div className="faq-items">
      <details><summary>Ist meine Telefonnummer sichtbar?<Plus size={19}/></summary><p>Nein. Wer deinen QR-Code scannt, sieht nur die verfügbaren Hinweisgründe und ein optionales Nachrichtenfeld. Deine E-Mail und Telefonnummer werden nicht angezeigt.</p></details>
      <details><summary>Muss man eine App installieren?<Plus size={19}/></summary><p>Nein. Der Code öffnet eine mobil optimierte Webseite. Ein Smartphone mit Kamera und Internet reicht.</p></details>
      <details><summary>Kann ich mehrere Fahrzeuge hinzufügen?<Plus size={19}/></summary><p>Ja. In deinem Dashboard kannst du bis zu zwölf individuelle Codes verwalten.</p></details>
      <details><summary>Kann ich meinen QR-Code deaktivieren?<Plus size={19}/></summary><p>Ja. Pausiere ihn jederzeit im Dashboard. Bereits empfangene Nachrichten bleiben dort sichtbar.</p></details>
      <details><summary>Kann ich schon einen Sticker bestellen?<Plus size={19}/></summary><p>Die digitale Version ist verfügbar, sobald der Dienst eingerichtet ist. Der Verkauf physischer Sticker wird separat aktiviert, wenn Produktion und Bezahlung angebunden sind.</p></details>
    </div></div></section>
    <section className="last-cta"><div className="container last-cta-inner"><span className="cta-symbol"><QrCode size={46}/></span><div><div className="kicker">WORAUF WARTEST DU?</div><h2>EIN KLEINER CODE.<br/><em>EIN GUTES GEFÜHL.</em></h2></div><a href="/app" className="btn btn-lime">Jetzt loslegen <ArrowUpRight size={20}/></a></div></section>
    <Footer/>
  </>;
}

type TurnstileWindow = Window & { turnstile?: { render: (element: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void } };
function Turnstile({ siteKey, onToken }: { siteKey: string | null; onToken: (value: string) => void }) {
  const node = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!siteKey || !node.current) return;
    let cancelled = false;
    let widget: string | undefined;
    const render = () => {
      const api = (window as TurnstileWindow).turnstile;
      if (!api || !node.current || cancelled || widget) return;
      widget = api.render(node.current, { sitekey: siteKey, callback: (value: string) => onToken(value),
        'expired-callback': () => onToken(''), 'error-callback': () => onToken('') });
    };
    if (!(window as TurnstileWindow).turnstile) {
      let script = document.getElementById('textme-turnstile') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'textme-turnstile'; script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true; script.defer = true; document.head.appendChild(script);
      }
      script.addEventListener('load', render);
      const timer = window.setInterval(render, 400);
      return () => { cancelled = true; clearInterval(timer); script?.removeEventListener('load', render); if (widget) (window as TurnstileWindow).turnstile?.remove(widget); };
    }
    render();
    return () => { cancelled = true; if (widget) (window as TurnstileWindow).turnstile?.remove(widget); };
  }, [siteKey, onToken]);
  return siteKey ? <div ref={node} className="turnstile-container" aria-label="Sicherheitsprüfung"/> : null;
}
function InnerLayout({ children, simple = false }: { children: React.ReactNode; simple?: boolean }) {
  return <div className="app-shell"><header className="app-topbar"><div className="container topbar-inner"><Logo/><a href={simple ? '/' : '/app'} className="back-link"><ArrowRight size={17} className="flipped"/>{simple ? 'Zur Startseite' : 'Zum Dashboard'}</a></div></header>{children}<div className="app-base"><a href="/datenschutz">Datenschutz</a><span>·</span><a href="/impressum">Impressum</a><span>·</span><span>© TextMe</span></div></div>;
}
function Auth({ config }: { config: Config }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [captcha, setCaptcha] = useState('');
  const captchaCallback = React.useCallback((value: string) => setCaptcha(value), []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (!sent) { await api('/auth/request', { method: 'POST', body: JSON.stringify({ email, turnstileToken: captcha }) }); setSent(true); }
      else { await api('/auth/verify', { method: 'POST', body: JSON.stringify({ email, code: pin }) }); window.location.assign('/app'); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <InnerLayout simple><main className="auth-main"><div className="auth-splash"><div className="kicker">DEIN DIGITALER FAHRZEUGBEGLEITER</div><h1>DEIN AUTO.<br/><em>DEIN CODE.</em></h1><p>Ein sicherer Zugang. Kein Passwort. Alles im Griff.</p><div className="auth-splash-graphic"><div><QrCode size={100} strokeWidth={1}/></div><span>DEIN AUTO. DEINE KONTROLLE.</span></div></div><section className="auth-panel"><div className="panel-step">DEIN TEXTME ZUGANG <span>{sent ? '02' : '01'} / 02</span></div><div className="auth-icon"><Mail size={26}/></div><h2>{sent ? 'Postfach prüfen.' : 'Schön, dass du da bist.'}</h2><p>{sent ? 'Wir haben einen sechsstelligen Code an ' + email + ' geschickt. Er ist 10 Minuten gültig.' : 'Mit deiner E-Mail-Adresse erhältst du einen einmaligen Anmeldecode. Ohne Passwort.'}</p><form onSubmit={submit} className="auth-form">
    {!sent ? <label>E-MAIL-ADRESSE<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de"/></label>
      : <label>DEIN ZUGANGSCODE<input type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="otp-input"/></label>}
    {!sent && <Turnstile siteKey={config.turnstileSiteKey} onToken={captchaCallback}/>}
    {error && <div className="form-error" role="alert">{error}</div>}
    <button disabled={busy || (!sent && Boolean(config.turnstileSiteKey) && !captcha)} type="submit" className="btn btn-dark full-btn">{busy ? 'Einen Moment …' : sent ? 'Anmelden' : 'Code per E-Mail senden'} <ArrowRight size={19}/></button>
    {sent && <button type="button" className="text-button" onClick={() => { setSent(false); setPin(''); setError(''); }}>Andere E-Mail verwenden</button>}
  </form><div className="auth-reassure"><LockKeyhole size={17}/> Deine E-Mail bleibt für andere unsichtbar.</div></section></main></InnerLayout>;
}
function Scan({ slug, config }: { slug: string; config: Config }) {
  const [loading, setLoading] = useState(true);
  const [isValid, setValid] = useState(false);
  const [reason, setReason] = useState('lights');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [captcha, setCaptcha] = useState('');
  const captchaCallback = React.useCallback((value: string) => setCaptcha(value), []);
  useEffect(() => {
    api('/public/' + slug).then(() => setValid(true)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [slug]);
  async function send(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/public/' + slug, { method: 'POST', body: JSON.stringify({ reason, note, turnstileToken: captcha }) }); setDone(true); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <InnerLayout simple><main className="scan-layout"><div className="scan-intro"><div className="kicker">TEXTME / FAHRZEUGKONTAKT</div><div className="scan-badge"><ScanLine size={22}/> QR CODE GESCANNT</div><h1>ETWAS<br/>AUFGEFALLEN<span>?</span></h1><p>Danke, dass du aufmerksam bist. Schick dem Fahrzeughalter einen kurzen Hinweis. Ganz einfach und ohne persönliche Kontaktdaten.</p><div className="scan-privacy"><ShieldCheck size={21}/><div><strong>Privat & unkompliziert</strong><span>Deine Nachricht geht direkt in das persönliche TextMe Postfach.</span></div></div></div>
    <div className="scan-form-card">
      {loading ? <div className="center-state"><span className="loader"/> QR-Code wird geprüft …</div> : !isValid ? <div className="center-state"><LockKeyhole size={48}/><h2>Code nicht erreichbar</h2><p>{error || 'Dieser Code ist derzeit nicht aktiv.'}</p></div> : done ? <div className="center-state success-state"><div className="big-success"><Check size={48}/></div><h2>Danke fürs Bescheidgeben!</h2><p>Dein Hinweis wurde gespeichert und ist für den Fahrzeughalter im TextMe Dashboard sichtbar.</p><a href="/" className="btn btn-dark">TextMe kennenlernen <ArrowUpRight size={18}/></a></div>
      : <><div className="scan-form-top"><div><small>SCHRITT 01 / 02</small><h2>Worum geht's?</h2></div><div className="form-number">01</div></div>
      <form onSubmit={send}>
        <fieldset className="reason-grid"><legend className="sr-only">Grund auswählen</legend>{reasons.map(item => {
          const Icon = item.icon;
          return <button key={item.id} type="button" aria-pressed={reason === item.id} className={'reason-item ' + (reason === item.id ? 'selected' : '')} onClick={() => setReason(item.id)}><Icon size={23}/><span>{item.label}</span>{reason === item.id && <CheckCircle2 size={18} className="reason-check"/>}</button>;
        })}</fieldset>
        <label className="message-label">OPTIONALE NACHRICHT <span>{note.length} / 320</span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={320} rows={4} placeholder="z. B. Das Licht auf der Fahrerseite ist noch an …"/></label>
        <Turnstile siteKey={config.turnstileSiteKey} onToken={captchaCallback}/>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-lime full-btn" type="submit" disabled={busy || (Boolean(config.turnstileSiteKey) && !captcha)}>{busy ? 'Wird übermittelt …' : 'Hinweis senden'} <Send size={18}/></button><div className="message-disclaimer">Bitte nur echte Hinweise senden. In Notfällen immer die zuständigen Einsatzkräfte kontaktieren.</div>
      </form></>}
    </div></main></InnerLayout>;
}
function CodeCard({ code, refresh }: { code: Code; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(code.label);
  const url = useMemo(() => linkFor(code.slug), [code.slug]);
  const [copied, setCopied] = useState(false);
  async function toggle() { setBusy(true); try { await api('/codes/' + code.id, { method: 'PATCH', body: JSON.stringify({ active: !code.active }) }); await refresh(); } catch(e) { alert((e as Error).message); } finally { setBusy(false); } }
  async function saveName() { setBusy(true); try { await api('/codes/' + code.id, { method: 'PATCH', body: JSON.stringify({ label }) }); setRenaming(false); await refresh(); } catch(e) { alert((e as Error).message); } finally { setBusy(false); } }
  async function changeTheme(theme: string) {
    setBusy(true);
    try { await api('/codes/' + code.id, { method: 'PATCH', body: JSON.stringify({ theme }) }); await refresh(); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  }
  async function download() {
    const theme = themesById(code.theme);
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Grafik konnte nicht erstellt werden.');
    ctx.fillStyle = theme.bg; ctx.fillRect(0,0,1200,1500);
    ctx.fillStyle = theme.ink;
    ctx.font = '800 130px Manrope, sans-serif';
    ctx.fillText('textme.', 115, 238);
    ctx.font = '700 25px Manrope, sans-serif';
    ctx.fillText('DEIN AUTO. ERREICHBAR. PRIVAT.', 115, 313);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(110,400,980,980);
    const data = await QRCode.toDataURL(url, { width: 800, margin: 2, errorCorrectionLevel: 'H', color: { dark: theme.qr, light: '#ffffff' } });
    await new Promise<void>((resolve, reject) => {
      const image = new Image(); image.onload=()=>{ctx.drawImage(image,200,490,800,800);resolve();};
      image.onerror=()=>reject(new Error('QR konnte nicht geladen werden.')); image.src=data;
    });
    ctx.fillStyle = theme.ink;
    ctx.font = '700 30px Manrope, sans-serif';
    ctx.fillText('SCAN ME IF YOU NOTICE SOMETHING', 115, 1458);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'textme-' + code.label.trim().replace(/[^a-z0-9äöü_-]/gi, '-') + '.png';
    a.click();
  }
  return <article className="code-card" data-theme={code.theme}><div className="code-card-top"><span className={code.active ? 'status-live' : 'status-paused'}><i/> {code.active ? 'AKTIV' : 'PAUSIERT'}</span><span className="code-id">{code.slug.slice(0, 7).toUpperCase()}</span></div>
    <div className="code-body"><div className="code-qr-box"><QRVisual value={url} theme={code.theme}/></div><div className="code-details">
      {renaming ? <div className="rename-row"><input aria-label="Fahrzeugname" value={label} maxLength={40} onChange={e => setLabel(e.target.value)}/><button type="button" onClick={saveName} disabled={busy}><Check size={18}/></button></div> : <button type="button" className="code-name" onClick={() => setRenaming(true)} title="Namen bearbeiten">{code.label} <span>✎</span></button>}
      <span className="code-subtitle">Deine private Fahrzeugverbindung</span><div className="code-stats"><div><strong>{code.views || 0}</strong><span>Aufrufe</span></div><div><strong>{code.message_count || 0}</strong><span>Hinweise</span></div></div>
    </div></div>
    <div className="design-picker"><div><span>DESIGN AUSWÄHLEN</span><small>{themesById(code.theme).title}</small></div><div className="theme-swatch-list">{themes.map(theme => <button type="button" key={theme.id} disabled={busy} title={theme.title} aria-label={theme.title} aria-pressed={theme.id === code.theme} className={theme.id === code.theme ? 'theme-swatch active' : 'theme-swatch'} style={{ backgroundColor: theme.bg }} onClick={() => changeTheme(theme.id)} />)}</div></div>
    <div className="code-actions"><button onClick={download} title="QR-Code als PNG herunterladen"><Download size={17}/> Download</button><button onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { alert('Link kann nicht kopiert werden.'); } }} title="Link kopieren">{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Kopiert' : 'Link'}</button><button disabled={busy} onClick={toggle} className="toggle-action" title={code.active ? 'Code pausieren' : 'Code aktivieren'}><Power size={17}/>{code.active ? 'Pausieren' : 'Aktivieren'}</button></div>
  </article>;
}
function Dashboard({ config }: { config: Config }) {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [codes, setCodes] = useState<Code[]>([]);
  const [messages, setMessages] = useState<Notice[]>([]);
  const [mode, setMode] = useState<'codes' | 'inbox' | 'settings'>('codes');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [setupError, setSetupError] = useState('');
  const unread = messages.filter(m => !m.is_read).length;
  async function refresh() {
    const [cc,mm] = await Promise.all([api<{ codes: Code[] }>('/codes'), api<{ messages: Notice[] }>('/messages')]);
    setCodes(cc.codes); setMessages(mm.messages);
  }
  useEffect(() => {
    api<{user:{email:string}|null}>('/auth/me').then(async data => {
      if (!data.user) { window.location.replace('/anmelden'); return; }
      setEmail(data.user.email); await refresh();
    }).catch((e:ApiError) => { if (e.status === 401) window.location.replace('/anmelden'); else setSetupError(e.message); }).finally(() => setChecking(false));
  }, []);
  async function add(event: React.FormEvent) {
    event.preventDefault(); setError(''); setCreating(true);
    try { await api('/codes', { method: 'POST', body: JSON.stringify({ label: newLabel }) }); setNewLabel(''); setShowCreate(false); await refresh(); }
    catch (e) { setError((e as Error).message); } finally { setCreating(false); }
  }
  async function markRead(id:string) { try { await api('/messages/' + id + '/read',{method:'PATCH'}); await refresh(); }catch(e){ alert((e as Error).message); } }
  async function logout() { try { await api('/auth/logout', {method:'POST'}); } finally { window.location.replace('/'); } }
  async function deleteAccount() {
    if (!window.confirm('Wirklich dein Konto mit allen QR-Codes und Nachrichten unwiderruflich löschen?')) return;
    const confirmation = window.prompt('Tippe DELETE, um die Löschung zu bestätigen.');
    if (confirmation !== 'DELETE') return;
    try { await api('/account', {method:'DELETE', body: JSON.stringify({confirm:'DELETE'})}); window.location.assign('/'); }
    catch(e) { alert((e as Error).message); }
  }
  return <InnerLayout><main className="container dash">
    {checking ? <div className="center-state"><span className="loader"/> Dashboard wird geladen …</div> : setupError ? <div className="setup-warning"><h2>Einrichtung noch nicht abgeschlossen</h2><p>{setupError}</p><p>Bitte D1, AUTH_SECRET und E-Mail-Versand in Cloudflare konfigurieren.</p></div> : <>
    <div className="dash-head"><div><div className="kicker"><span className="kicker-icon">TM</span> DEIN KONTROLLZENTRUM</div><h1>Alles im <em>Blick.</em></h1><p>Verbunden bleiben. Die Kontrolle behalten.</p></div><div className="dash-profile"><div className="profile-avatar">{email.slice(0,1).toUpperCase()}</div><div><strong>Mein Konto</strong><span>{email}</span></div></div></div>
    <div className="dash-stats"><div><span>AKTIVE QR-CODES</span><div><QrCode size={24}/><strong>{codes.filter(c=>Boolean(c.active)).length}</strong></div></div><div><span>NEUE HINWEISE</span><div><Inbox size={24}/><strong>{unread}</strong></div></div><div><span>CODE-AUFRUFE</span><div><Eye size={24}/><strong>{codes.reduce((n,c)=>n+(c.views||0),0)}</strong></div></div></div>
    <div className="dash-tabbar"><div className="dash-tabs"><button className={mode === 'codes' ? 'active':''} onClick={() => setMode('codes')}><QrCode size={18}/> Meine Codes</button><button className={mode === 'inbox' ? 'active':''} onClick={() => setMode('inbox')}><Inbox size={18}/> Postfach {unread>0&&<i>{unread}</i>}</button><button className={mode === 'settings' ? 'active':''} onClick={() => setMode('settings')}><ShieldCheck size={18}/> Konto</button></div>{mode==='codes'&&<button className="btn btn-dark new-code-btn" onClick={() => setShowCreate(true)}><Plus size={18}/> Neuer QR-Code</button>}</div>
    {mode === 'codes' && <div className="codes-list">{codes.length ? codes.map(code=><CodeCard key={code.id} code={code} refresh={refresh}/>) : <div className="empty-panel"><div className="empty-icon"><QrCode size={40}/></div><h2>Dein erster Code wartet.</h2><p>Erstelle einen persönlichen QR-Code für dein Fahrzeug. Kostenlos, in wenigen Sekunden.</p><button className="btn btn-lime" onClick={() => setShowCreate(true)}>QR-Code erstellen <Plus size={19}/></button></div>}</div>}
    {mode === 'inbox' && <div className="inbox-area"><div className="area-header"><div><h2>Deine Hinweise</h2><p>Alle Meldungen von deinen Fahrzeugcodes, die letzten 100 zuerst.</p></div><span>{messages.length} Nachrichten</span></div>{messages.length===0 ? <div className="empty-panel smaller"><Inbox size={42}/><h3>Noch keine Hinweise</h3><p>Wenn jemand deinen QR-Code scannt und dir schreibt, erscheint die Nachricht hier.</p></div> : <div className="message-list">{messages.map(item => <article className={'inbox-item ' + (!item.is_read ? 'unread' : '')} key={item.id}><div className="message-symbol"><Bell size={21}/></div><div><div className="message-meta"><span>{item.vehicle_label}</span><span>{new Date(item.created_at*1000).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})}</span></div><h3>{reasonName(item.reason)}</h3><p>{item.note || 'Keine zusätzliche Nachricht.'}</p>{!item.emailed && <small>Im Dashboard gespeichert</small>}</div>{!item.is_read && <button type="button" className="mark-read" onClick={() => markRead(item.id)}>Als gelesen markieren <Check size={15}/></button>}</article>)}</div>}</div>}
    {mode === 'settings' && <div className="settings-card"><h2>Mein Konto</h2><p>Angemeldet als <strong>{email}</strong></p><div className="setting-row"><div><strong>E-Mail-Benachrichtigungen</strong><p>{config.notificationsEnabled ? 'E-Mail-Versand ist auf dem Server aktiviert.' : 'E-Mail-Versand ist noch nicht eingerichtet. Hinweise bleiben im Dashboard sichtbar.'}</p></div><span className={config.notificationsEnabled ? 'setting-on' : 'setting-off'}>{config.notificationsEnabled ? 'Aktiv' : 'Nicht eingerichtet'}</span></div><div className="setting-row"><div><strong>Sitzung beenden</strong><p>Du kannst dich jederzeit sicher abmelden.</p></div><button onClick={logout} className="subtle-button">Abmelden <ArrowRight size={17}/></button></div><div className="setting-row danger-row"><div><strong>Mein Konto löschen</strong><p>Alle QR-Codes und Nachrichten unwiderruflich entfernen.</p></div><button className="delete-button" onClick={deleteAccount}>Konto löschen</button></div></div>}
    {showCreate && <div className="modal-shade" role="presentation" onMouseDown={e => { if(e.target===e.currentTarget)setShowCreate(false); }}><div className="create-modal" role="dialog" aria-modal="true" aria-label="Neuen QR-Code erstellen"><div className="modal-header"><div className="modal-icon"><QrCode size={25}/></div><button className="icon-button" onClick={() => setShowCreate(false)} aria-label="Schließen"><X size={22}/></button></div><h2>Neuer QR-Code</h2><p>Wie möchtest du das Fahrzeug nennen? Nur du siehst diesen Namen.</p><form onSubmit={add}><label>FAHRZEUGNAME<input value={newLabel} autoFocus required maxLength={40} onChange={e => setNewLabel(e.target.value)} placeholder="z. B. Mein BMW, Firmenwagen …"/></label>{error&&<div className="form-error" role="alert">{error}</div>}<button type="submit" disabled={creating} className="btn btn-lime full-btn">{creating?'Wird erstellt …':'QR-Code generieren'} <ArrowRight size={19}/></button></form></div></div>}
    </>}
  </main></InnerLayout>;
}
function Legal({ type }: { type: 'datenschutz' | 'impressum' }) {
  return <InnerLayout simple><main className="container legal-page"><div className="kicker">RECHTLICHE INFORMATIONEN</div><h1>{type==='impressum'?'Impressum':'Datenschutz'}</h1><div className="legal-box"><CircleHelp size={30}/><h2>Vor der Veröffentlichung ergänzen</h2><p>Die rechtlich erforderlichen Angaben müssen mit den tatsächlichen Betreiber- und Kontaktdaten ergänzt und geprüft werden. Diese Seite ist ausdrücklich ein Platzhalter und keine fertige Rechtserklärung.</p></div></main></InnerLayout>;
}
function Main() {
  const path = window.location.pathname;
  const [config,setConfig] = useState<Config>({turnstileSiteKey:null,notificationsEnabled:false});
  useEffect(() => { api<Config>('/config').then(setConfig).catch(()=>{}); }, []);
  if (path.startsWith('/q/')) return <Scan slug={path.slice(3)} config={config}/>;
  if (path==='/anmelden') return <Auth config={config}/>;
  if (path==='/app') return <Dashboard config={config}/>;
  if (path==='/impressum'||path==='/datenschutz') return <Legal type={path.slice(1) as 'datenschutz'|'impressum'}/>;
  return <Landing/>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Main/></React.StrictMode>);

