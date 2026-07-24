# Storage manifest

Four storage buckets are used by the app. **All four are (re)created by
`schema.sql`** (they're defined via `INSERT INTO storage.buckets` in the
migrations), so you do not need to create them by hand on the new project.

| Bucket | Public | Used by |
|---|---|---|
| `avatars` | yes | profile avatar uploads |
| `venue-images` | yes | venue photo gallery |
| `team-logos` | yes | team logos (incl. AI-generated) |
| `blog-images` | yes | blog cover images (incl. AI-generated) |

## Copying the objects (files inside the buckets)

Bucket **objects** (the actual uploaded images) can't be enumerated with the
public anon key, so they are **not** included in this bundle. Since the project
is pre-launch, there are likely few or none.

If you do want to carry objects over, do it from a context that has the source
project's credentials (i.e. once the project is in a Supabase dashboard you
control):

```bash
# with the Supabase CLI logged into BOTH projects, or a small script using
# each project's service_role key + the storage API:
#   1. list objects in each source bucket
#   2. download each
#   3. upload to the same bucket on the new project
```

Or simply let them regenerate — avatars/logos/covers are re-uploaded or
re-generated in normal use.
