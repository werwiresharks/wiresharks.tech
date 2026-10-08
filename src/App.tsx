import { createRef, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Pause,
  Play,
  X,
  List,
} from "@phosphor-icons/react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import { products } from "./content/products";
import type { Product } from "./content/products";
import type { MotionValue } from "motion/react";
import DroneVisual from "./components/DroneVisual";

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-35px" }}
      transition={{ duration: 0.75, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span className={large ? "wordmark wordmark-large" : "wordmark"}>
      WIRE<span>SHARKS</span>
      <i aria-hidden="true" />
    </span>
  );
}
function Header() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
      if (event.key === "Tab") {
        const links = menu.current?.querySelectorAll<HTMLAnchorElement>("a");
        if (!links) return;
        if (event.shiftKey && document.activeElement === links[0]) {
          event.preventDefault();
          toggle.current?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === links[links.length - 1]
        ) {
          event.preventDefault();
          toggle.current?.focus();
        } else if (document.activeElement === toggle.current) {
          event.preventDefault();
          links[event.shiftKey ? links.length - 1 : 0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="masthead">
      <Link className="brand-link" to="/" aria-label="Wiresharks home">
        <Wordmark />
      </Link>
      <button
        ref={toggle}
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="navigation"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={23} /> : <List size={23} />}
      </button>
      <nav
        id="navigation"
        ref={menu}
        className={open ? "nav open" : "nav"}
        aria-label="Main navigation"
      >
        <Link to="/products/wireshark">Wireshark</Link>
        <Link to="/products/sidekick">Sidekick</Link>
        <Link to="/products/munki">Munki</Link>
        <Link to="/products/everyway">EveryWay</Link>
        <Link to="/#work">All work</Link>
        <Link to="/#contact">
          Let’s talk <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
}
function Contact() {
  return (
    <section className="contact section-wrap" id="contact">
      <Reveal>
        <p className="eyebrow">Start a conversation</p>
        <div className="contact-row">
          <h2>
            What’s beyond
            <br />
            your boundaries?
          </h2>
          <a
            className="contact-arrow"
            href="mailto:tkosgi@purdue.edu,sgunti@purdue.edu"
            aria-label="Email Wiresharks"
          >
            <ArrowUpRight weight="light" />
          </a>
        </div>
        <a className="email-link" href="mailto:tkosgi@purdue.edu">
          tkosgi@purdue.edu <ArrowUpRight size={19} />
        </a>
        <a className="email-link" href="mailto:sgunti@purdue.edu">
          sgunti@purdue.edu <ArrowUpRight size={19} />
        </a>
      </Reveal>
    </section>
  );
}
function Footer() {
  return (
    <footer className="footer section-wrap">
      <div className="footer-top">
        <Link to="/" aria-label="Wiresharks home">
          Independent engineering.
        </Link>
        <a
          href="https://github.com/werwiresharks"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ArrowUpRight size={15} />
        </a>
        <span>© {new Date().getFullYear()} Wiresharks</span>
      </div>
      <Link
        className="footer-brand"
        to="/"
        aria-label="Back to Wiresharks home"
      >
        <Wordmark large />
      </Link>
    </footer>
  );
}
function ProductArt({
  product,
  interactive = true,
}: {
  product: Product;
  interactive?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  if (product.id === "wireshark")
    return (
      <div className="product-art drone-product">
        <span className="art-caption">
          Wireshark · conceptual visualization
        </span>
        <DroneVisual paused={paused || !!reduced} interactive={interactive} />
        <button
          className="motion-toggle product-motion-toggle"
          onClick={() => setPaused(!paused)}
          disabled={!!reduced}
          aria-label={
            reduced
              ? "Reduced motion"
              : paused
                ? "Play drone motion"
                : "Pause drone motion"
          }
        >
          {paused || reduced ? <Play size={13} /> : <Pause size={13} />}
          <span>
            {reduced
              ? "Reduced motion"
              : paused
                ? "Play motion"
                : "Pause motion"}
          </span>
        </button>
      </div>
    );
  if (product.id === "sidekick")
    return (
      <div className="product-art sidekick-art">
        <img
          src="/assets/sidekick/icon.png"
          alt="Sidekick app icon"
          loading="lazy"
        />
        <div className="sidekick-orbits" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="sidekick-art-wordmark">Sidekick</span>
        <div className="sidekick-wave" aria-hidden="true">
          {Array.from({ length: 29 }, (_, i) => (
            <i
              key={i}
              style={{
                height: `${12 + Math.abs(Math.sin(i * 1.9)) * (1 - Math.abs(i - 14) / 18) * 70}px`,
              }}
            />
          ))}
        </div>
        <span className="art-caption">Native intelligence for macOS</span>
      </div>
    );
  if (product.image)
    return (
      <figure className={`product-art image-art ${product.id}`}>
        <img src={product.image.src} alt={product.image.alt} loading="lazy" />
        <figcaption className="art-caption">{product.image.caption}</figcaption>
      </figure>
    );
  return (
    <div className="product-art">
      <span className="art-caption">{product.name}</span>
    </div>
  );
}
const PROJECT_STACK_TOP = 104;
const PROJECT_STACK_BOTTOM = 24;

type ProjectRefs = {
  anchor: RefObject<HTMLDivElement | null>;
  surface: RefObject<HTMLDivElement | null>;
};

function ProductChapter({
  product,
  index,
  refs,
  nextAnchor,
  stacked,
}: {
  product: Product;
  index: number;
  refs: ProjectRefs;
  nextAnchor?: ProjectRefs["anchor"];
  stacked: boolean;
}) {
  const { scrollYProgress } = useScroll({
    target: nextAnchor ?? refs.anchor,
    offset: ["start end", `start ${PROJECT_STACK_TOP}px`],
  });
  const transform = useTransform(
    scrollYProgress,
    [0, 1],
    ["scale(1)", "scale(0.95)"],
  );
  const dim = useTransform(scrollYProgress, [0, 1], [0, 0.12]);
  const depth = stacked && !!nextAnchor;
  return (
    <>
      <div
        ref={refs.anchor}
        className="project-flow-anchor"
        id={`story-${product.id}`}
        tabIndex={-1}
        role="group"
        aria-labelledby={`story-heading-${product.id}`}
      />
      <article
        className={`product-chapter chapter-${product.id}`}
        style={{ zIndex: index + 1 }}
        aria-labelledby={`story-heading-${product.id}`}
        onFocusCapture={(event) => {
          if (stacked && event.target.matches(":focus-visible")) {
            refs.anchor.current?.scrollIntoView({
              behavior: "instant",
              block: "start",
            });
          }
        }}
      >
        <motion.div
          ref={refs.surface}
          className="project-card-surface"
          style={{ transform: depth ? transform : "none" }}
        >
          <div className="chapter-topline">
            <p className="eyebrow">{product.story.visualLabel}</p>
            <span className="chapter-status">{product.status}</span>
          </div>
          <div className="chapter-heading">
            <div>
              <p className="eyebrow">{product.category}</p>
              <h3 id={`story-heading-${product.id}`}>
                {product.name}
                <span>.</span>
              </h3>
            </div>
            <p>{product.tagline}</p>
          </div>
          <div className="chapter-body">
            <div className="chapter-visual">
              <ProductArt product={product} />
              <span className="chapter-number" aria-hidden="true">
                0{index + 1}
              </span>
            </div>
            <div className="chapter-copy">
              <p className="chapter-summary">{product.summary}</p>
              <p className="muted">{product.purpose}</p>
              <Link className="text-link" to={`/products/${product.id}`}>
                Inside {product.name} <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
          <motion.div
            className="project-card-dim"
            aria-hidden="true"
            style={{ opacity: depth ? dim : 0 }}
          />
        </motion.div>
      </article>
    </>
  );
}
function ProjectStack() {
  const reduced = useReducedMotion();
  const [stacked, setStacked] = useState(false);
  const [refs] = useState(() =>
    products.map(() => ({
      anchor: createRef<HTMLDivElement>(),
      surface: createRef<HTMLDivElement>(),
    })),
  );
  useEffect(() => {
    const measure = () => {
      const viewport = window.visualViewport;
      const width = Math.min(window.innerWidth, viewport?.width ?? window.innerWidth);
      const height = Math.min(window.innerHeight, viewport?.height ?? window.innerHeight);
      const available = height - PROJECT_STACK_TOP - PROJECT_STACK_BOTTOM;
      setStacked(
        !reduced &&
          width >= 900 &&
          refs.every(
            ({ surface }) =>
              surface.current !== null && surface.current.offsetHeight <= available,
          ),
      );
    };
    const observer = new ResizeObserver(measure);
    refs.forEach(({ surface }) => {
      if (surface.current) observer.observe(surface.current);
    });
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [reduced, refs]);
  return (
    <div
      className={`project-stack${stacked ? " is-stacked" : ""}`}
      style={{ "--project-stack-top": `${PROJECT_STACK_TOP}px` } as CSSProperties}
    >
      {products.map((product, index) => (
        <ProductChapter
          key={product.id}
          product={product}
          index={index}
          refs={refs[index]}
          nextAnchor={refs[index + 1]?.anchor}
          stacked={stacked}
        />
      ))}
    </div>
  );
}
function Work({ flightProgress }: { flightProgress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const opacity = useTransform(flightProgress, [0.35, 0.8], [0.25, 1]);
  const transform = useTransform(
    flightProgress,
    [0.35, 0.8],
    ["translateY(32px)", "translateY(0px)"],
  );
  return (
    <section id="work" className="work section-wrap">
      <motion.div
        className="work-intro"
        style={reduced ? undefined : { opacity, transform }}
      >
        <p className="eyebrow">Selected explorations / 01—04</p>
        <h2>
          Different frontiers.
          <br />
          <span className="muted">The same curiosity.</span>
        </h2>
        <p>
          Hardware. Software.
          <br />
          Human experience.
        </p>
      </motion.div>
      <nav className="chapter-index" aria-label="Product chapters">
        {products.map((product, index) => (
          <Link
            key={product.id}
            to={`/#story-${product.id}`}
          >
            <span>0{index + 1}</span>
            {product.name}
          </Link>
        ))}
      </nav>
      <ProjectStack />
    </section>
  );
}
function Home() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const flightProgress = useMotionValue(0);
  useEffect(() => {
    const update = () => {
      const bounds = hero.current?.getBoundingClientRect();
      if (bounds)
        flightProgress.set(
          Math.max(0, Math.min(1, -bounds.top / (bounds.height * 0.88))),
        );
    };
    const resize = new ResizeObserver(update);
    if (hero.current) resize.observe(hero.current);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resize.disconnect();
    };
  }, [flightProgress]);
  const opacity = useTransform(flightProgress, [0, 0.82, 1], [1, 1, 0]);
  return (
    <>
      <motion.div
        className={`hero-drone ${reduced ? "static-drone" : ""}`}
        style={reduced ? undefined : { opacity }}
      >
        <DroneVisual
          flightProgress={flightProgress}
          paused={paused || !!reduced}
        />
      </motion.div>
      <section className="hero" ref={hero}>
        <div className="hero-atmosphere" />
        <motion.div
          className="hero-copy"
          initial={reduced ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <p className="eyebrow">Introducing Wireshark. Our flagship drone.</p>
          <h1>
            Engineering
            <br />
            <span>beyond </span>
            <span>boundaries.</span>
          </h1>
          <p className="hero-summary">
            Independent engineering across
            <br />
            physical and digital frontiers.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/products/wireshark">
              Explore Wireshark <ArrowRight size={18} />
            </Link>
            <Link className="hero-secondary" to="/#work">
              All projects <ArrowDown size={16} />
            </Link>
          </div>
        </motion.div>
        <div className="hero-bottom">
          <span className="visualization-label">
            Wireshark <span> / Conceptual fiber-optic drone</span>
          </span>
          <button
            className="motion-toggle"
            onClick={() => setPaused(!paused)}
            disabled={!!reduced}
            aria-label={
              reduced
                ? "Reduced motion"
                : paused
                  ? "Play background motion"
                  : "Pause background motion"
            }
          >
            {paused || reduced ? <Play size={13} /> : <Pause size={13} />}
            <span>
              {reduced
                ? "Reduced motion"
                : paused
                  ? "Play motion"
                  : "Pause motion"}
            </span>
          </button>
        </div>
      </section>
      <Work flightProgress={flightProgress} />
      <Contact />
    </>
  );
}
function ProductDetail() {
  const { slug } = useParams();
  const product = products.find((item) => item.id === slug);
  if (!product) return <NotFound />;
  return (
    <>
      <section className="detail-intro section-wrap">
        <Link className="back-link" to="/#work">
          <ArrowRight size={15} /> All work
        </Link>
        <div className="detail-heading">
          <div>
            <p className="eyebrow">
              {product.id === "wireshark"
                ? "Fiber-optic drone"
                : product.category}
            </p>
            <h1>{product.name}</h1>
          </div>
          <p>{product.tagline}</p>
        </div>
        <div className="detail-art">
          <ProductArt product={product} />
        </div>
        <div className="detail-description">
          <p className="eyebrow">{product.status}</p>
          <div>
            <h2>{product.summary}</h2>
            <p className="muted">{product.purpose}</p>
            {product.researchBrief && (
              <article className="research-brief" id="research-brief">
                <p className="eyebrow">Research brief</p>
                <h3>{product.researchBrief.title}</h3>
                <p className="muted">{product.researchBrief.summary}</p>
                <a
                  className="text-link"
                  href={product.researchBrief.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read research brief (PDF, {product.researchBrief.pages} pages)
                  <ArrowUpRight size={17} />
                </a>
              </article>
            )}
          </div>
        </div>
      </section>
      <section className="detail-facts section-wrap">
        <p className="eyebrow">Inside the project</p>
        <div>
          {product.facts.map((fact) => (
            <Reveal className="fact" key={fact.title}>
              <h3>{fact.title}</h3>
              <p>{fact.text}</p>
              {fact.source && (
                <a
                  href={fact.source}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Source for ${fact.title}`}
                >
                  <ArrowUpRight size={21} />
                </a>
              )}
            </Reveal>
          ))}
          {product.links.length > 0 && (
            <div className="source-links">
              {product.links.map((link) => (
                <a
                  className="text-link"
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                  <ArrowUpRight size={17} />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
      {product.id === "everyway" && (
        <section
          className="gallery section-wrap"
          aria-label="EveryWay project gallery"
        >
          <figure>
            <img
              src="/assets/everyway/physical-prototype.jpeg"
              alt="Wired sensor and miniature physical venue used for the EveryWay prototype"
              loading="lazy"
            />
            <figcaption>The physical world, in miniature.</figcaption>
          </figure>
          <figure>
            <img
              src="/assets/everyway/operator-dashboard.jpg"
              alt="EveryWay operator dashboard displaying route and sensor information"
              loading="lazy"
            />
            <figcaption>A shared view of a changing space.</figcaption>
          </figure>
        </section>
      )}
      <section className="next-project section-wrap">
        <p className="eyebrow">Keep exploring</p>
        <Link
          to={`/products/${products[(products.indexOf(product) + 1) % products.length].id}`}
        >
          {products[(products.indexOf(product) + 1) % products.length].name}
          <ArrowUpRight weight="light" />
        </Link>
      </section>
      <Contact />
    </>
  );
}
function NotFound() {
  return (
    <section className="not-found section-wrap">
      <p className="eyebrow">Page not found</p>
      <h1>
        A little beyond
        <br />
        the boundaries.
      </h1>
      <Link className="button" to="/">
        Back to home <ArrowRight />
      </Link>
    </section>
  );
}
function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    const product = products.find(
      (item) => location.pathname === `/products/${item.id}`,
    );
    document.title = product
      ? `${product.name} | Wiresharks`
      : "Wiresharks | Engineering beyond boundaries.";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        product?.summary ??
          "Independent engineering across physical and digital frontiers. Explore Wiresharks technology research and development.",
      );
    let cancelled = false;
    let frame = 0;
    const jump = () => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        const target = location.hash
          ? document.getElementById(location.hash.slice(1))
          : document.getElementById("main");
        target?.setAttribute("tabindex", "-1");
        target?.focus({ preventScroll: true });
        if (location.hash) target?.scrollIntoView({ behavior: "instant" });
        else window.scrollTo({ top: 0, behavior: "instant" });
      });
    };
    if (location.hash) void document.fonts.ready.then(jump);
    else jump();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [location]);
  return null;
}
export default function App() {
  const location = useLocation();
  const reduced = useReducedMotion();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <RouteEffects />
      <Header />
      <motion.main
        id="main"
        key={location.pathname}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/products/fiber-optic-drone"
            element={<Navigate to="/products/wireshark" replace />}
          />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.main>
      <Footer />
    </>
  );
}
