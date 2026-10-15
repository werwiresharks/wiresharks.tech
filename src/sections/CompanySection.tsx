import { ArrowUpRight } from "@phosphor-icons/react";
import { CONTACT_EMAIL, CONTACT_HREF } from "../site";

export function CompanySection() {
  return (
    <section className="section company section-wrap" id="contact" aria-labelledby="company-title">
      <div className="company-text">
        <p className="eyebrow">05 / Company</p>
        <h2 id="company-title">Wiresharks</h2>
        <p>
          Wiresharks is an independent technology company building autonomous AI systems and
          specialized intelligence. We are based in West Lafayette, Indiana.
        </p>
      </div>
      <div className="company-contact">
        <p className="eyebrow">Contact</p>
        <a className="contact-link" href={CONTACT_HREF}>
          <span>{CONTACT_EMAIL}</span>
          <ArrowUpRight size={28} weight="light" />
        </a>
      </div>
    </section>
  );
}
