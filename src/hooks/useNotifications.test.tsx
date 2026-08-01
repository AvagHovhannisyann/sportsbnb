import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Two mounts of `useNotifications` must share one realtime channel.
 *
 * `NotificationDropdown` mounts this hook twice — once for the list, once via
 * `useUnreadNotificationCount` for the badge — and both asked for the same
 * topic. `supabase.channel(topic)` returns the channel that already exists
 * rather than a new one, so the second mount called `.on()` on a channel that
 * had been subscribed, which supabase-js 2.111 rejects:
 *
 *   cannot add `postgres_changes` callbacks for realtime:notifications-… after
 *   `subscribe()`
 *
 * Thrown inside `useEffect`, that reached the error boundary, which remounted
 * the header, which threw again: an endless render loop on every signed-in
 * page. No unit test caught it and no route check reported it as a failure —
 * the audits simply stopped finishing, because a spinning main thread makes
 * every later navigation time out.
 *
 * So the assertion is about the channel, not the rendering: `.on()` is only
 * ever reached once per user, and a second subscriber never touches a
 * subscribed channel. The fake below reproduces the two behaviours that
 * combined to cause the bug — same instance per topic, and a throw on late
 * `.on()` — so this test fails against the original hook.
 */

const user = { id: "user-1" };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user }) }));

type FakeChannel = {
  topic: string;
  subscribed: boolean;
  on: (...args: unknown[]) => FakeChannel;
  subscribe: () => FakeChannel;
};

const channels = new Map<string, FakeChannel>();
let onCalls = 0;
let removed: string[] = [];

const makeChannel = (topic: string): FakeChannel => {
  const channel: FakeChannel = {
    topic,
    subscribed: false,
    on: (...args: unknown[]) => {
      // The real client's guard, which is the whole point of the test.
      if (channel.subscribed) {
        throw new Error(
          `cannot add \`postgres_changes\` callbacks for realtime:${topic} after \`subscribe()\`.`,
        );
      }
      void args;
      onCalls += 1;
      return channel;
    },
    subscribe: () => {
      channel.subscribed = true;
      return channel;
    },
  };
  return channel;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    // Returns the existing channel for a topic, exactly as supabase-js does.
    channel: (topic: string) => {
      const existing = channels.get(topic);
      if (existing) return existing;
      const created = makeChannel(topic);
      channels.set(topic, created);
      return created;
    },
    removeChannel: (channel: FakeChannel) => {
      channels.delete(channel.topic);
      removed.push(channel.topic);
      return Promise.resolve("ok");
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        }),
      }),
    }),
  },
}));

const { useNotifications, useUnreadNotificationCount } = await import("./useNotifications");

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  channels.clear();
  onCalls = 0;
  removed = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useNotifications realtime subscription", () => {
  it("subscribes once when the same component mounts it twice", async () => {
    // The exact shape of NotificationDropdown: the list and the badge.
    const { unmount } = renderHook(
      () => {
        useNotifications();
        return useUnreadNotificationCount();
      },
      { wrapper },
    );

    await waitFor(() => expect(channels.size).toBe(1));
    expect(onCalls).toBe(1);
    expect(channels.get("notifications-user-1")?.subscribed).toBe(true);

    unmount();
  });

  it("keeps the channel open while any subscriber remains", async () => {
    const first = renderHook(() => useNotifications(), { wrapper });
    const second = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(channels.size).toBe(1));
    expect(onCalls).toBe(1);

    first.unmount();
    // Still one consumer, so the channel must survive.
    expect(removed).toEqual([]);
    expect(channels.size).toBe(1);

    second.unmount();
    expect(removed).toEqual(["notifications-user-1"]);
  });

  it("resubscribes cleanly after the last subscriber leaves", async () => {
    const first = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(channels.size).toBe(1));
    first.unmount();

    const second = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(channels.size).toBe(1));
    // A fresh channel, subscribed once — not the torn-down one reused.
    expect(onCalls).toBe(2);
    second.unmount();
  });
});
