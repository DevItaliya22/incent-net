"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Eye,
  MoreVertical,
  Edit2,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";

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
  comments?: Post[];
  _count?: {
    likes: number;
    comments: number;
    views: number;
  };
}

interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
  showComments?: boolean;
  expanded?: boolean;
}

export function PostCard({
  post,
  onUpdate,
  showComments: showCommentsProp = true,
  expanded = false,
}: PostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(
    post.likesCount || post._count?.likes || 0
  );
  const [viewsCount, setViewsCount] = useState(
    post.viewsCount || post._count?.views || 0
  );
  const [comments, setComments] = useState<Post[]>([]);
  const [commentsExpanded, setCommentsExpanded] = useState(expanded);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/likes?postId=${post.id}`)
        .then((res) => res.json())
        .then((data) => setLiked(data.liked));
    }
  }, [post.id, session]);

  useEffect(() => {
    if (session?.user?.id && !post.parentPostId) {
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      }).catch(() => {});
    }
  }, [post.id, post.parentPostId, session]);

  const handleLike = async () => {
    if (!session?.user?.id) {
      toast.error("Please login to like posts");
      return;
    }

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to like post");
        return;
      }

      const data = await response.json();
      const newLikedState = data.liked;
      const wasLiked = liked;

      setLiked(newLikedState);

      if (newLikedState && !wasLiked) {
        setLikesCount((prev) => prev + 1);
      } else if (!newLikedState && wasLiked) {
        setLikesCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleEdit = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        toast.success("Post updated");
        setIsEditing(false);
        onUpdate?.();
      } else {
        toast.error("Failed to update post");
      }
    } catch (error) {
      toast.error("Failed to update post");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Post deleted");
        onUpdate?.();
      } else {
        toast.error("Failed to delete post");
      }
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState("");

  const loadComments = async () => {
    if (commentsLoaded && comments.length > 0 && !expanded) return;

    try {
      const response = await fetch(`/api/posts?parentPostId=${post.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
        setCommentsLoaded(true);
      }
    } catch (error) {
      toast.error("Failed to load comments");
    }
  };

  useEffect(() => {
    if (expanded && !commentsLoaded) {
      loadComments();
    }
  }, [expanded]);

  const toggleComments = () => {
    if (!commentsExpanded) {
      loadComments();
    }
    setCommentsExpanded(!commentsExpanded);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !session?.user?.id) {
      toast.error("Please login to comment");
      return;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentContent,
          parentPostId: post.id,
        }),
      });

      if (response.ok) {
        toast.success("Comment posted");
        setCommentContent("");
        setShowCommentForm(false);
        loadComments();
        onUpdate?.();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to post comment");
      }
    } catch (error) {
      toast.error("Failed to post comment");
    }
  };

  const isAuthor = session?.user?.id === post.authorId;
  const isComment = !!post.parentPostId;

  const handlePostClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button, [role="button"]')) {
      return;
    }
    e.stopPropagation();
    router.push(`/feed/${post.id}`);
  };

  const handleMouseEnter = () => {
    router.prefetch(`/feed/${post.id}`);
    // Prefetch the API data as well
    fetch(`/api/posts/${post.id}`, { method: "GET" }).catch(() => {});
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        isComment ? "ml-8 bg-muted/50" : "bg-card"
      } cursor-pointer hover:bg-accent/50 transition-colors`}
      onClick={handlePostClick}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex items-start gap-3">
        <Link href={`/profile/${post.author.id}`}>
          <Avatar>
            <AvatarImage src={post.author.image || ""} />
            <AvatarFallback>
              {post.author.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${post.author.id}`}
                className="font-semibold hover:underline"
              >
                {post.author.name || post.author.email}
              </Link>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
                {post.edited && " (edited)"}
              </span>
            </div>
            {isAuthor && !isComment && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsDeleting(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {post.content && (
            <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
          )}
          {post.image && (
            <div className="mt-2">
              <img
                src={post.image}
                alt="Post image"
                className="w-full rounded-lg object-cover max-h-96"
              />
            </div>
          )}
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={liked ? "text-red-500" : ""}
            >
              <Heart
                className={`h-4 w-4 mr-1 ${liked ? "fill-current" : ""}`}
              />
              {likesCount}
            </Button>
            {!isComment && (
              <>
                <Button variant="ghost" size="sm" onClick={toggleComments}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {post._count?.comments || 0}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCommentForm(!showCommentForm);
                    if (!commentsExpanded) {
                      toggleComments();
                    }
                  }}
                >
                  Comment
                </Button>
              </>
            )}
            {isComment && (
              <Button variant="ghost" size="sm" onClick={toggleComments}>
                <MessageCircle className="h-4 w-4 mr-1" />
                {post._count?.comments || 0}
              </Button>
            )}
            {isComment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCommentForm(!showCommentForm);
                  if (!commentsExpanded) {
                    toggleComments();
                  }
                }}
              >
                Reply
              </Button>
            )}
            {!isComment && (
              <Button variant="ghost" size="sm" disabled>
                <Eye className="h-4 w-4 mr-1" />
                {viewsCount}
              </Button>
            )}
          </div>
          {showCommentForm && (
            <form onSubmit={handleCommentSubmit} className="mt-4 space-y-2">
              <Textarea
                placeholder={
                  isComment ? "Write a reply..." : "Write a comment..."
                }
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                rows={3}
                maxLength={10000}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCommentForm(false);
                    setCommentContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentContent.trim()}
                >
                  Comment
                </Button>
              </div>
            </form>
          )}
          {commentsExpanded && (
            <div className="mt-4 space-y-2">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <PostCard
                    key={comment.id}
                    post={comment}
                    onUpdate={() => {
                      setCommentsLoaded(false);
                      loadComments();
                    }}
                    expanded={expanded}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>Make changes to your post</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
