import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { Header } from "./components/Header";
import { Wordmark } from "./components/Wordmark";
import { Hero } from "./sections/Hero";
import { TalosSection } from "./sections/TalosSection";
import { AutonomySection } from "./sections/AutonomySection";
import { TalonSection } from "./sections/TalonSection";
import { PhilosophySection } from "./sections/PhilosophySection";
import { CompanySection } from "./sections/CompanySection";
import { CONTACT_EMAIL, CONTACT_HREF, NAV } from "./site";

const TITLE = "Wiresharks | Talos. Autonomy you can inspect.";

function Home() {
  return (
    <>
      <Hero />
      <TalosSection />
      <AutonomySection />
      <TalonSection />
      <PhilosophySection />
      <CompanySection />
    </>
  );
}

function NotFound() {
  useEffect(() => {
    document.title = "Page not found | Wiresharks";
    return () => {
      document.title = TITLE;
    };
  }, []);
  return (
    <section className="not-found section-wrap">
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
            <Link key={item.id} to={`/#${item.id}`}>
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
        <span>West Lafayette, Indiana</span>
      </p>
    </footer>
  );
}

/** Scroll to hash targets after navigation, and to the top otherwise. */
function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = 0;
      if (location.hash) {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: "start" });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location]);
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
          {/* The former project portfolio now lives in repository history only. */}
          <Route path="/products/*" element={<Navigate to="/" replace />} />
          <Route path="/research/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
