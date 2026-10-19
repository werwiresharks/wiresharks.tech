import { Link } from "react-router-dom";
import { ArrowUpRight } from "@phosphor-icons/react";
import { CONTACT_EMAIL, CONTACT_HREF, GITHUB_HREF } from "../site";
import { LogoMark } from "./LogoMark";
import { Wordmark } from "./Wordmark";

const PRODUCTS = [
  { to: "/raptor", label: "Raptor", note: "Agent" },
  { to: "/talon", label: "Talon-1", note: "Model" },
  { to: "/#platform", label: "Platform", note: "Architecture" },
  { to: "/#faq", label: "FAQ", note: "Answers" },
];

export function Footer() {
  return (
    <footer className="footer tone-dark">
      <div className="footer-inner wrap">
        <div className="footer-brand">
          <Link className="brand-link" to="/" aria-label="Wiresharks home">
            <LogoMark />
            <Wordmark />
          </Link>
          <p>Autonomous cybersecurity. An agent, and the local, open-weight model that powers it.</p>
        </div>
        <nav className="footer-col" aria-label="Products">
          <h2 className="label">Products</h2>
          <ul>
            {PRODUCTS.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
                <span className="label">{item.note}</span>
              </li>
            ))}
          </ul>
        </nav>
        <div className="footer-col">
          <h2 className="label">Company</h2>
          <ul>
            <li>
              <a href={CONTACT_HREF}>{CONTACT_EMAIL}</a>
            </li>
            <li>
              <a href={GITHUB_HREF} target="_blank" rel="noreferrer">
                GitHub <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="wrap">
        <div className="footer-meta">
          <span>© {new Date().getFullYear()} Wiresharks</span>
          <span>Raptor / Talon-1 / Built for authorized security work</span>
        </div>
      </div>
      <p className="footer-mark" aria-hidden="true">
        WIRESHARKS
      </p>
    </footer>
  );
}
