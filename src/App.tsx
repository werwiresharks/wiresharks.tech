import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Talos } from "./pages/Talos";
import { Talon } from "./pages/Talon";

function NotFound() {
  return (
    <section className="not-found wrap">
      <title>Page not found | Wiresharks</title>
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
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const id = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollManager />
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
