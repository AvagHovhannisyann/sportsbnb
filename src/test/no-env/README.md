Intentionally empty.

`vitest.config.ts` points `envDir` here so the test run loads no `.env` file.
Vite reads `.env` in every mode, which meant `npm test` locally ran with real
`VITE_SUPABASE_*` values while CI ran with none — so a test that transitively
imported the Supabase client passed locally and failed in CI with
"supabaseUrl is required". Aiming `envDir` at a directory containing no env
files makes the two agree.

Git does not track empty directories, which is why this file exists.
