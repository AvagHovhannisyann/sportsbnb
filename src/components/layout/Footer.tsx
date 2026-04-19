import { Link } from "react-router-dom";

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

  return (
    <footer className="border-t border-border bg-surface-1 mt-auto">
      <div className="container py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-8">
          <div className="col-span-2 md:col-span-5 max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2 mb-5">
              <img src="/favicon.png" alt="Sportsbnb" className="h-9 w-9 rounded-lg" />
              <span className="font-display text-xl font-bold text-foreground tracking-extra-tight">
                Sportsbnb
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The simplest way to find and book sports venues. Built for players, designed for owners.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-3 gap-6">
            <div>
              <h4 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-4 font-semibold">
                Product
              </h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
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

            <div>
              <h4 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-4 font-semibold">
                Company
              </h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
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

            <div>
              <h4 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-4 font-semibold">
                Legal
              </h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
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
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
