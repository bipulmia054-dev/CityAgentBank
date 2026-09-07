import React, { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import "./app-shell.css";

export default function AppShell({ children, menu = [], active, onNavigate, title = "Document Studio", actions, className = "", footer }) {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  const [open, setOpen] = useState(() => !window.matchMedia("(max-width: 900px)").matches);
  const toggle = useRef(null);
  const sidebar = useRef(null);
  const wasOpen = useRef(open);
  const close = () => setOpen(false);
  useEffect(() => {
    if (wasOpen.current && !open) toggle.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const change = () => { setMobile(media.matches); setOpen(!media.matches); };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => { if (mobile) setOpen(false); }, [active, mobile]);
  useEffect(() => {
    if (!mobile || !open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector("button")?.focus();
    const keydown = event => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const items = sidebar.current?.querySelectorAll("button, a[href], input, select, textarea, [tabindex='0']");
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", keydown); };
  }, [mobile, open]);

  return <div className={`appShell portal ${className} ${open ? "navOpen" : "navClosed"}`}>
    <header className="appHeader" inert={mobile && open ? true : undefined}>
      <button ref={toggle} className="appIconButton" aria-label={open ? "Close sidebar" : "Open sidebar"} aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(value => !value)}>{open ? <X/> : <Menu/>}</button>
      <div className="appBrand"><img src="/city-agent-banking-logo.png" alt="সিটি এজেন্ট ব্যাংকিং"/><div><b>Amjhupi Agent Banking</b><small>{title}</small></div></div>
      <div className="appHeaderActions">{actions}</div>
    </header>
    <div className="appBody">
      {mobile && open && <button className="appBackdrop" aria-label="Close navigation backdrop" tabIndex={-1} onClick={close}/>}
      <aside ref={sidebar} id="app-navigation" className="appSidebar" inert={!open ? true : undefined} aria-label="Main navigation" role={mobile && open ? "dialog" : undefined} aria-modal={mobile && open ? true : undefined}>
        <div className="appNavHeading"><span>WORKSPACE</span>{mobile && <button className="appIconButton" aria-label="Close navigation" onClick={close}><X/></button>}</div>
        <nav>{menu.map(([id, Icon, label]) => <button key={id} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={() => { onNavigate?.(id); if (mobile) close(); }}><Icon/><span>{label}</span></button>)}</nav>
        {footer && <div className="appNavFooter">{footer}</div>}
      </aside>
      <main className="portalContent appContent" inert={mobile && open ? true : undefined}>{children}</main>
    </div>
  </div>;
}
