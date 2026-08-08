import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import { AIChatbot } from "@/components/chat/AIChatbot";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  showMobileNav?: boolean;
  showAssistant?: boolean;
}

const Layout = ({
  children,
  showFooter = true,
  showMobileNav = true,
  showAssistant = true,
}: LayoutProps) => {
  return (
    <div
      className={`min-h-screen flex flex-col bg-background ${
        showMobileNav
          ? "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
          : ""
      }`}
    >
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-3 z-[100] rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {showFooter && <Footer />}
      {showMobileNav && <MobileNav />}
      {showAssistant && <AIChatbot hasMobileNav={showMobileNav} />}
    </div>
  );
};

export default Layout;
