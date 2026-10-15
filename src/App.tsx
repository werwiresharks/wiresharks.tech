import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { Header } from "./components/Header";
import { Wordmark } from "./components/Wordmark";
import { Home } from "./pages/Home";
import { Talos } from "./pages/Talos";
import { Talon } from "./pages/Talon";
import { CONTACT_EMAIL, CONTACT_HREF, NAV } from "./site";

function NotFound() {
  return (
    <section className="not-found section-wrap">
      <title>Page not found | Wiresharks</title>
      <p className="eyebrow">404</p>
      <h1>This page does not exist.</h1>
      <Link className="button" to="/">
        Back to Wiresharks <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer section-wrap">
      <div className="footer-top">
        <nav aria-label="Footer">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
        <a href={CONTACT_HREF}>{CONTACT_EMAIL}</a>
        <a href="https://github.com/werwiresharks" target="_blank" rel="noreferrer">
          GitHub <ArrowUpRight size={13} />
        </a>
      </div>
      <Link className="footer-brand" to="/" aria-label="Back to Wiresharks home">
        <Wordmark large />
      </Link>
      <p className="footer-meta">
        <span>© {new Date().getFullYear()} Wiresharks</span>
      </p>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/talos" element={<Talos />} />
          <Route path="/talon" element={<Talon />} />
          <Route path="/products/*" element={<Navigate to="/" replace />} />
          <Route path="/research/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
