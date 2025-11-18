"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { PostCard } from "@/components/post-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface Post {
  id: string;
  content: string;
  image: string | null;
  authorId: string;
  parentPostId: string | null;
  likesCount: number;
  viewsCount: number;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
  comments: Post[];
  _count: {
    likes: number;
    comments: number;
    views: number;
  };
}

export default function PostDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      loadPost();
    }
  }, [status, postId, router]);

  const loadPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      } else {
        toast.error("Post not found");
        router.push("/feed");
      }
    } catch (error) {
      toast.error("Failed to load post");
      router.push("/feed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    loadPost();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <PostCard post={post} onUpdate={handleUpdate} expanded={true} />
      </div>
    </div>
  );
}
