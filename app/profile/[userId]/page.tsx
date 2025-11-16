"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { PostCard } from "@/components/post-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, UserMinus, Coins, Package } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  wallet: number;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

interface Post {
  id: string;
  content: string;
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

interface PurchaseItem {
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
    description: string | null;
  };
  quantity: number;
  purchases: Array<{
    id: string;
    createdAt: string;
  }>;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUser();
      loadPosts();
      loadPurchases();
      checkFollow();
    }
  }, [userId, session]);

  const loadUser = async () => {
    try {
      const response = await fetch(`/api/user?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      toast.error("Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await fetch(`/api/posts?authorId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      toast.error("Failed to load posts");
    }
  };

  const loadPurchases = async () => {
    try {
      const response = await fetch(`/api/purchases?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPurchases(data);
      }
    } catch (error) {
      toast.error("Failed to load purchases");
    }
  };

  const checkFollow = async () => {
    if (!session?.user?.id || session.user.id === userId) return;

    try {
      const response = await fetch(`/api/follows/check?followingId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.following);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleFollow = async () => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setFollowing(data.following);
        loadUser();
        toast.success(data.following ? "Following" : "Unfollowed");
      }
    } catch (error) {
      toast.error("Failed to follow/unfollow");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">User not found</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = session?.user?.id === userId;

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || ""} />
                <AvatarFallback className="text-2xl">
                  {user.name?.charAt(0).toUpperCase() ||
                    user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">
                      {user.name || user.email}
                    </h1>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                  {!isOwnProfile && (
                    <Button
                      variant={following ? "outline" : "default"}
                      onClick={handleFollow}
                    >
                      {following ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex gap-6 mt-4">
                  <div>
                    <span className="font-semibold">{user._count.posts}</span>
                    <span className="text-muted-foreground ml-1">Posts</span>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {user._count.followers}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      Followers
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {user._count.following}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      Following
                    </span>
                  </div>
                  {isOwnProfile && (
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      <span className="font-semibold">{user.wallet}</span>
                      <span className="text-muted-foreground ml-1">Points</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="posts" className="space-y-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No posts yet
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={loadPosts} />
              ))
            )}
          </TabsContent>
          {isOwnProfile && (
            <TabsContent value="purchases">
              {purchases.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No purchases yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {purchases.map((purchaseItem) => (
                    <Card key={purchaseItem.product.id}>
                      <CardHeader>
                        <div className="aspect-video relative overflow-hidden rounded-lg mb-2">
                          <img
                            src={purchaseItem.product.image}
                            alt={purchaseItem.product.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <CardTitle>{purchaseItem.product.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          {purchaseItem.product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            {purchaseItem.product.price} points
                          </span>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span className="text-sm">
                              Qty: {purchaseItem.quantity}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
