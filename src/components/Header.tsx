import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import { NAV } from "../site";
import { Wordmark } from "./Wordmark";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location]);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

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
      <div className="masthead-bar">
        <Link className="brand-link" to="/" aria-label="Wiresharks home">
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
          {open ? <X size={22} /> : <List size={22} />}
        </button>
        <nav id="navigation" ref={menu} className={open ? "nav open" : "nav"} aria-label="Main navigation">
          {NAV.map((item) => (
            <Link key={item.id} to={`/#${item.id}`} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link className="nav-cta" to="/#contact" onClick={() => setOpen(false)}>
            Contact <ArrowUpRight size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
