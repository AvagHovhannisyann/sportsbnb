import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllBlogPosts,
  useCreateBlogPost,
  useDeleteBlogPost,
  useUpdateBlogPost,
  type BlogPost,
} from "@/hooks/useBlogPosts";
import { supabase } from "@/integrations/supabase/client";
import { TONE_CHIP } from "@/lib/chips";

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  target_keyword: string;
  author_name: string;
  is_published: boolean;
}

const emptyForm: PostFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  target_keyword: "",
  author_name: "SportsBnb Team",
  is_published: false,
};

const PostStatus = ({ published }: { published: boolean }) => (
  <Badge variant="outline" className={published ? TONE_CHIP.positive : TONE_CHIP.neutral}>
    {published ? "Published" : "Draft"}
  </Badge>
);

const BlogPostsTab = () => {
  const postsQuery = useAllBlogPosts();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingWasPublished, setEditingWasPublished] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [unpublishConfirmationOpen, setUnpublishConfirmationOpen] = useState(false);
  const [form, setForm] = useState<PostFormData>(emptyForm);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setEditingWasPublished(false);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setEditingWasPublished(post.is_published);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      cover_image_url: post.cover_image_url || "",
      target_keyword: post.target_keyword || "",
      author_name: post.author_name,
      is_published: post.is_published,
    });
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((previous) => ({
      ...previous,
      title,
      slug: editingId ? previous.slug : generateSlug(title),
    }));
  };

  const generateCoverImage = async (
    title: string,
    content: string,
    keyword: string,
  ): Promise<string | null> => {
    try {
      setIsGeneratingImage(true);
      const { data, error } = await supabase.functions.invoke("generate-ai-image", {
        body: {
          prompt: `Create a visually striking, professional blog header image for an article titled "${title}". The article is about: ${keyword || content.slice(0, 200)}. Style: modern, clean, sports-themed with vibrant colors. No text in the image. Landscape orientation, suitable as a blog cover.`,
          type: "blog-cover",
          bucket: "blog-images",
        },
      });
      if (error) throw error;
      return data?.url || null;
    } catch (error) {
      console.error("Failed to generate cover image:", error);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const savePost = async () => {
    if (!form.title.trim() || !form.content.trim()) return false;

    const formToSave = { ...form };

    // Preserve the existing publishing flow: a missing cover triggers the
    // existing generation function before the post mutation is submitted.
    if (form.is_published && !form.cover_image_url) {
      const imageUrl = await generateCoverImage(form.title, form.content, form.target_keyword);
      if (imageUrl) {
        formToSave.cover_image_url = imageUrl;
        setForm((previous) => ({ ...previous, cover_image_url: imageUrl }));
      }
    }

    try {
      if (editingId) {
        await updatePost.mutateAsync({ id: editingId, ...formToSave });
      } else {
        await createPost.mutateAsync(formToSave);
      }
      setDialogOpen(false);
      return true;
    } catch {
      // Mutation hooks provide the user-facing toast and the editor stays open.
      return false;
    }
  };

  const handleSave = async () => {
    if (editingId && editingWasPublished && !form.is_published) {
      setUnpublishConfirmationOpen(true);
      return;
    }
    await savePost();
  };

  const confirmDelete = () => {
    if (!postToDelete) return;
    deletePost.mutate(postToDelete.id, {
      onSuccess: () => setPostToDelete(null),
    });
  };

  const isSaving = createPost.isPending || updatePost.isPending || isGeneratingImage;
  const posts = postsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0">
          <CardTitle as="h2" className="text-lg">Blog posts</CardTitle>
          <CardDescription className="mt-1">Draft, publish, and maintain marketplace articles.</CardDescription>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New post
        </Button>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {postsQuery.isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading blog posts">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : postsQuery.isError ? (
          <ErrorPanel
            what="blog posts"
            description="No draft or publication status has been inferred from the failed request."
            onRetry={() => postsQuery.refetch()}
            isRetrying={postsQuery.isFetching}
            className="py-8"
          />
        ) : posts.length === 0 ? (
          <StatusPanel
            icon={FileText}
            title="No blog posts yet"
            description="Create a draft when the first marketplace article is ready."
            className="py-8"
          >
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Create first post
            </Button>
          </StatusPanel>
        ) : (
          <>
            <ul className="space-y-3 lg:hidden" aria-label="Blog posts">
              {posts.map((post) => (
                <li key={post.id} className="rounded-lg border border-border bg-surface-1 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold leading-snug text-foreground">{post.title}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">/blog/{post.slug}</p>
                    </div>
                    <PostStatus published={post.is_published} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Target keyword</dt>
                      <dd className="mt-0.5 break-words text-foreground">
                        {post.target_keyword || "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Last published</dt>
                      <dd className="mt-0.5 text-foreground">
                        {post.published_at
                          ? format(new Date(post.published_at), "MMM d, yyyy")
                          : "Not published"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {post.is_published && (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`View published post: ${post.title}`}
                        >
                          <ExternalLink aria-hidden="true" />
                          View
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className={post.is_published ? undefined : "col-span-2"}
                      onClick={() => openEdit(post)}
                      aria-label={`Edit post: ${post.title}`}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2 text-destructive hover:text-destructive"
                      onClick={() => setPostToDelete(post)}
                      aria-label={`Delete post: ${post.title}`}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete post
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block">
              <Table>
                <caption className="sr-only">
                  Blog posts with search keywords, publication states, dates, and actions.
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-md">
                        <p className="break-words font-semibold leading-snug text-foreground">{post.title}</p>
                        <p className="mt-0.5 break-all text-xs text-muted-foreground">/blog/{post.slug}</p>
                      </TableCell>
                      <TableCell className="max-w-56">
                        {post.target_keyword ? (
                          <Badge variant="secondary" className="h-auto whitespace-normal py-1 text-left leading-4">
                            {post.target_keyword}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell><PostStatus published={post.is_published} /></TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {post.published_at
                          ? format(new Date(post.published_at), "MMM d, yyyy")
                          : "Not published"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {post.is_published && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                to={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`View published post: ${post.title}`}
                              >
                                <ExternalLink aria-hidden="true" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(post)}
                            aria-label={`Edit post: ${post.title}`}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPostToDelete(post)}
                            aria-label={`Delete post: ${post.title}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit post" : "New blog post"}</DialogTitle>
            <DialogDescription>
              Required fields are marked. Publishing without a cover URL keeps the existing automated cover workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="blog-post-title">Title <span aria-hidden="true">*</span></Label>
              <Input
                id="blog-post-title"
                value={form.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="How to find sports facilities near you"
                aria-required="true"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-post-slug">URL slug</Label>
              <Input
                id="blog-post-slug"
                value={form.slug}
                onChange={(event) => setForm((previous) => ({ ...previous, slug: event.target.value }))}
                placeholder="how-to-find-sports-facilities"
              />
              <p className="break-all text-xs text-muted-foreground">Published path: /blog/{form.slug || "your-post"}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-post-excerpt">Excerpt</Label>
              <Textarea
                id="blog-post-excerpt"
                value={form.excerpt}
                onChange={(event) => setForm((previous) => ({ ...previous, excerpt: event.target.value }))}
                placeholder="A brief summary for the blog listing"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-post-content">Content in Markdown <span aria-hidden="true">*</span></Label>
              <Textarea
                id="blog-post-content"
                value={form.content}
                onChange={(event) => setForm((previous) => ({ ...previous, content: event.target.value }))}
                placeholder="Write the article content"
                rows={12}
                className="font-mono text-sm"
                aria-required="true"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="blog-post-keyword">Target keyword</Label>
                <Input
                  id="blog-post-keyword"
                  value={form.target_keyword}
                  onChange={(event) => setForm((previous) => ({ ...previous, target_keyword: event.target.value }))}
                  placeholder="book sports facilities"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blog-post-author">Author</Label>
                <Input
                  id="blog-post-author"
                  value={form.author_name}
                  onChange={(event) => setForm((previous) => ({ ...previous, author_name: event.target.value }))}
                  placeholder="SportsBnb Team"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-post-cover-image">Cover image URL</Label>
              <Input
                id="blog-post-cover-image"
                type="url"
                value={form.cover_image_url}
                onChange={(event) => setForm((previous) => ({ ...previous, cover_image_url: event.target.value }))}
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 px-3.5 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="blog-post-published">Published</Label>
                <p className="text-xs leading-4 text-muted-foreground">
                  {form.is_published ? "Visible on the public blog." : "Kept as an internal draft."}
                </p>
              </div>
              <Switch
                id="blog-post-published"
                checked={form.is_published}
                onCheckedChange={(checked) => setForm((previous) => ({ ...previous, is_published: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.title.trim() || !form.content.trim()}
            >
              {isSaving && (
                <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              )}
              {isGeneratingImage
                ? "Preparing cover…"
                : editingId
                  ? "Save changes"
                  : "Create post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {postToDelete ? `“${postToDelete.title}”` : "This post"} will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePost.isPending}>Keep post</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={deletePost.isPending}
              className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
            >
              {deletePost.isPending ? "Deleting…" : "Delete post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unpublishConfirmationOpen} onOpenChange={setUnpublishConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish this post?</AlertDialogTitle>
            <AlertDialogDescription>
              Saving these changes will remove the article from the public blog. Its content will remain available here as a draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSaving}
              onClick={() =>
                setForm((previous) => ({ ...previous, is_published: true }))
              }
            >
              Keep published
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                event.preventDefault();
                if (await savePost()) setUnpublishConfirmationOpen(false);
              }}
              disabled={isSaving}
              className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
            >
              {isSaving ? "Saving…" : "Unpublish and save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BlogPostsTab;
