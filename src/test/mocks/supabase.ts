import { vi } from "vitest";

type QueryResult = { data: unknown; error: unknown };

/**
 * Chainable mock for the supabase-js query builder.
 * Every method returns the builder; awaiting it resolves with the given result.
 */
export function createQueryBuilderMock(result: QueryResult = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "in",
    "is",
    "or",
    "not",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
  ];
  for (const method of methods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

/** Minimal supabase client mock; override per-test as needed. */
export function createSupabaseMock(result?: QueryResult) {
  return {
    from: vi.fn(() => createQueryBuilderMock(result)),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
  };
}
