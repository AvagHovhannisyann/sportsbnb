import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  target_keyword: string | null;
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function usePublishedBlogPosts() {
  return useQuery({
    queryKey: ["blog-posts", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as unknown as BlogPost[];
    },
  });
}

export function useBlogPostBySlug(slug: string) {
  return useQuery({
    queryKey: ["blog-posts", "slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data as unknown as BlogPost;
    },
    enabled: !!slug,
  });
}

export function useAllBlogPosts() {
  return useQuery({
    queryKey: ["blog-posts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as BlogPost[];
    },
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (post: {
      title: string;
      slug: string;
      excerpt?: string;
      content: string;
      cover_image_url?: string;
      target_keyword?: string;
      author_name?: string;
      is_published?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .insert({
          ...post,
          created_by: user?.id,
          published_at: post.is_published ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast({ title: "Blog post created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating post", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updates.is_published && !updates.published_at) {
        updateData.published_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast({ title: "Blog post updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating post", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast({ title: "Blog post deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting post", description: error.message, variant: "destructive" });
    },
  });
}
