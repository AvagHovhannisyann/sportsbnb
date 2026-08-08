import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

const Footer = () => {
  const footerLinks = {
    product: [
      { href: "/venues", label: "Browse venues" },
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
    <footer className="mt-auto border-t border-border bg-surface-1">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4 max-w-sm">
            <Link
              to="/"
              aria-label="Sportsbnb home"
              className="mb-4 inline-flex min-h-11 items-center rounded-md opacity-90 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 md:mb-5"
            >
              <Logo variant="full" className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The simplest way to find and book sports venues. Built for players, designed for owners.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:col-span-8">
            {linkSections.map((section) => (
              <div key={section.title}>
                {/* Each link group begins a section within the footer landmark. */}
                <h2 className="mb-3 font-display text-sm font-semibold text-foreground md:mb-4">
                  {section.title}
                </h2>
                <ul className="space-y-0.5 md:space-y-1">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="focus-ring inline-flex min-h-11 min-w-11 items-center rounded-sm text-sm text-foreground-soft transition-colors hover:text-foreground"
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

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 md:mt-12 md:flex-row md:items-center md:pt-7">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sportsbnb. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made for players. Built with care.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
