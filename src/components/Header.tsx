import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import { CONTACT_HREF, NAV } from "../site";
import { LogoMark } from "./LogoMark";
import { Wordmark } from "./Wordmark";
import { RaptorWordmark } from "./RaptorWordmark";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location]);

  useEffect(() => {
    let frame = 0;
    let max = 0;
    const update = () => {
      frame = 0;
      header.current?.style.setProperty("--p", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
      setScrolled(window.scrollY > 24);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Scroll frames never read layout. The page length is read again only when layout changes.
    const length = new ResizeObserver(() => {
      max = document.documentElement.scrollHeight - window.innerHeight;
      schedule();
    });
    length.observe(document.body);
    // The dark section under the bar's centre line decides its glass tone. The observer's root is a
    // one-pixel band at that line, so the browser reports only the scrolls that cross a section edge.
    const under = new Set<Element>();
    let band: IntersectionObserver | null = null;
    const watch = () => {
      band?.disconnect();
      under.clear();
      band = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) under.add(entry.target);
            else under.delete(entry.target);
          }
          setDark(under.size > 0);
        },
        { rootMargin: `-40px 0px ${41 - window.innerHeight}px 0px` },
      );
      for (const node of document.querySelectorAll("main .tone-dark, footer.tone-dark")) {
        if (!node.closest(".claw")) band.observe(node);
      }
    };
    const onResize = () => {
      watch();
      schedule();
    };
    watch();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      length.disconnect();
      band?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
    };
  }, [location]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const close = () => {
      if (!desktop.matches && menu.current?.contains(document.activeElement)) {
        toggle.current?.focus();
      }
      setOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      // Keep focus inside the open menu and its toggle.
      const items = [
        toggle.current!,
        ...Array.from(menu.current?.querySelectorAll<HTMLElement>("a") ?? []),
      ];
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? index - 1 : index + 1;
      if (next < 0 || next >= items.length) {
        event.preventDefault();
        items[next < 0 ? items.length - 1 : 0].focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header ref={header} className={`masthead${scrolled ? " scrolled" : ""}${open ? " menu-open" : ""}`}>
      <div className={`masthead-bar${dark ? " tone-dark" : ""}`}>
        <Link className="brand-link" to="/" aria-label="Wiresharks home">
          <LogoMark />
          <Wordmark />
        </Link>
        <button
          ref={toggle}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="navigation"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <List size={20} />}
        </button>
        <nav id="navigation" ref={menu} className={open ? "nav open" : "nav"} aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
              {item.wordmark ? <RaptorWordmark /> : item.label}
            </NavLink>
          ))}
          <a className="nav-cta" href={CONTACT_HREF} onClick={() => setOpen(false)}>
            Contact <ArrowUpRight size={13} weight="bold" />
          </a>
        </nav>
      </div>
    </header>
  );
}
