import { Component, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/common/StatusPanel";

/**
 * The app had no error boundary of any kind, so a single component throwing
 * took the whole document with it — `document.body` rendered empty, with no
 * nav, no message and nothing to click. That was observed for real: an
 * unexpected shape reaching `AchievementsSection` blanked the entire player
 * dashboard.
 *
 * React's default for an uncaught render error is to unmount the whole tree,
 * which is the right default for correctness and the worst possible one for
 * the person looking at the screen. This catches it at the route level: the
 * failing page is replaced, the chrome survives, and there is a way out.
 *
 * `resetKey` is the pathname — navigating anywhere clears the error, so a
 * crash on one route does not strand the session.
 */
interface Props {
  children: ReactNode;
  resetKey: string;
}

interface State {
  error: Error | null;
}

class Boundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    // Route changed since the error — let the new page try to render.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Layout>
        <div className="container flex min-h-[60vh] items-center justify-center py-16">
          <StatusPanel
            icon={AlertTriangle}
            tone="danger"
            title="Something went wrong on this page"
            description="This one is on us — the page hit an error while rendering. Nothing you did caused it, and your account and bookings are unaffected."
          >
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button variant="outline" asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </StatusPanel>
        </div>
      </Layout>
    );
  }
}

/** Wrapper supplying the current pathname as the reset key. */
export const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
};

export default RouteErrorBoundary;
