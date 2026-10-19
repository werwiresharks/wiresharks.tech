import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import { CONTACT_HREF, NAV } from "../site";
import { LogoMark } from "./LogoMark";
import { Wordmark } from "./Wordmark";

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
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const max = root.scrollHeight - window.innerHeight;
      header.current?.style.setProperty("--p", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
      setScrolled(window.scrollY > 24);
      // The first page layer under the bar's centre line decides its glass tone.
      const below = document.elementsFromPoint(window.innerWidth / 2, 40).find((node) => !header.current?.contains(node));
      setDark(Boolean(below?.closest(".tone-dark")));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [location]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const close = () => setOpen(false);
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
          {NAV.map((item) =>
            item.to.includes("#") ? (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ) : (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ),
          )}
          <a className="nav-cta" href={CONTACT_HREF} onClick={() => setOpen(false)}>
            Contact <ArrowUpRight size={13} weight="bold" />
          </a>
        </nav>
      </div>
    </header>
  );
}
