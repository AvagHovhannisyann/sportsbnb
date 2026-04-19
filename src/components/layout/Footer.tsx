import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

const Footer = () => {
  const footerLinks = {
  const footerLinks = {
    product: [
      { href: "/venues", label: "Browse venues" },
      { href: "/nearby", label: "Nearby fields map" },
      { href: "/for-owners", label: "For venue owners" },
      { href: "/add-venue", label: "List your venue" },
    ],
    company: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
    legal: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  };

  const linkSections = [
    { title: "Product", links: footerLinks.product },
    { title: "Company", links: footerLinks.company },
    { title: "Legal", links: footerLinks.legal },
  ];

  return (
    <footer className="border-t border-border bg-surface-1 mt-auto">
      <div className="container py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          <div className="md:col-span-5 max-w-sm">
            <Link to="/" aria-label="Sportsbnb home" className="inline-flex items-center mb-4 md:mb-5 opacity-90 hover:opacity-100 transition-opacity">
              <Logo variant="full" className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The simplest way to find and book sports venues. Built for players, designed for owners.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            {linkSections.map((section) => (
              <div key={section.title}>
                <h4 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-3 md:mb-4 font-semibold">
                  {section.title}
                </h4>
                <ul className="space-y-2.5 md:space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-foreground-soft hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 md:mt-14 pt-6 md:pt-8 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sportsbnb. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {["Instagram", "Twitter", "LinkedIn"].map((s) => (
              <a
                key={s}
                href={`https://${s.toLowerCase()}.com/sportsbnb`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
