import { useEffect, useRef } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Raptor } from "./pages/Raptor";
import { Talon } from "./pages/Talon";
import { LiveConsole } from "./pages/LiveConsole";
import { usePanelGlow } from "./components/usePanelGlow";

function NotFound() {
  return (
    <section className="not-found wrap">
      <title>Page not found | Wiresharks</title>
      <meta name="robots" content="noindex" />
      <p className="label">Error / 404</p>
      <h1>This page does not exist.</h1>
      <Link className="cta cta-primary" to="/">
        Back to Wiresharks
        <span className="cta-arrow" aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

/** Top of page on route change; to the target section for `/#anchor` links. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    // A route replaces the page content; give keyboard users its new starting point.
    if (previousPath.current !== pathname) {
      document.getElementById("main")?.focus({ preventScroll: true });
      previousPath.current = pathname;
    }
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const id = window.requestAnimationFrame(() => {
      let target = hash.slice(1);
      try {
        target = decodeURIComponent(target);
      } catch {
        // A malformed fragment must not interrupt navigation.
      }
      document.getElementById(target)?.scrollIntoView();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  usePanelGlow();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollManager />
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/raptor" element={<Raptor />} />
          <Route path="/talos" element={<Navigate to="/raptor" replace />} />
          <Route path="/talon" element={<Talon />} />
          <Route path="/console" element={<LiveConsole />} />
          <Route path="/products/*" element={<Navigate to="/" replace />} />
          <Route path="/research/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
