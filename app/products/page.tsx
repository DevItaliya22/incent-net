"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingCart, Package, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string | null;
  createdAt: string;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<Map<string, number>>(
    new Map()
  );
  const [userWallet, setUserWallet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (session?.user?.id) {
      loadProducts();
      loadPurchases();
      loadWallet();
    }
  }, [session]);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/purchases?userId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        const quantityMap = new Map<string, number>();
        data.forEach((item: { product: Product; quantity: number }) => {
          quantityMap.set(item.product.id, item.quantity);
        });
        setPurchasedItems(quantityMap);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const loadWallet = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/user?userId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserWallet(data.wallet);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handlePurchase = async (productId: string, price: number) => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    const quantity = quantities.get(productId) || 1;
    const totalPrice = price * quantity;

    if (userWallet < totalPrice) {
      toast.error("Insufficient points");
      return;
    }

    setPurchasing(productId);
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });

      if (response.ok) {
        toast.success(`Purchased ${quantity} item(s)!`);
        setUserWallet((prev) => prev - totalPrice);
        setQuantities(new Map(quantities.set(productId, 1)));
        loadPurchases();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to purchase product");
      }
    } catch (error) {
      toast.error("Failed to purchase product");
    } finally {
      setPurchasing(null);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const currentQty = quantities.get(productId) || 1;
    const newQty = Math.max(1, currentQty + delta);
    setQuantities(new Map(quantities.set(productId, newQty)));
  };

  const setQuantity = (productId: string, qty: number) => {
    const newQty = Math.max(1, Math.floor(qty) || 1);
    setQuantities(new Map(quantities.set(productId, newQty)));
  };

  if (!session) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">Please login to view products</p>
              <Button asChild>
                <a href="/login">Login</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your wallet:</span>
            <span className="text-lg font-semibold">{userWallet} points</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading products...</div>
        ) : (
          <>
            {purchasedItems.size > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">My Purchases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(purchasedItems.entries()).map(
                    ([productId, quantity]) => {
                      const product = products.find((p) => p.id === productId);
                      if (!product) return null;
                      return (
                        <Card key={productId}>
                          <CardHeader>
                            <div className="aspect-video relative overflow-hidden rounded-lg mb-2">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <CardTitle>{product.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                              {product.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold">
                                {product.price} points
                              </span>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Package className="h-4 w-4" />
                                <span className="text-sm">Qty: {quantity}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Available Products
              </h2>
              {products.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No products available yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => {
                    const purchasedQty = purchasedItems.get(product.id) || 0;
                    const buyQuantity = quantities.get(product.id) || 1;
                    const totalPrice = product.price * buyQuantity;
                    const canAfford = userWallet >= totalPrice;

                    return (
                      <Card key={product.id}>
                        <CardHeader>
                          <div className="aspect-video relative overflow-hidden rounded-lg mb-2">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <CardTitle>{product.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {product.description}
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold">
                                {product.price} points each
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                Quantity:
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() => updateQuantity(product.id, -1)}
                                  disabled={buyQuantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={buyQuantity}
                                  onChange={(e) =>
                                    setQuantity(
                                      product.id,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-16 text-center"
                                />
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() => updateQuantity(product.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">
                                Total: {totalPrice} points
                              </span>
                              <Button
                                onClick={() =>
                                  handlePurchase(product.id, product.price)
                                }
                                disabled={
                                  !canAfford || purchasing === product.id
                                }
                                size="sm"
                              >
                                {purchasing === product.id ? (
                                  "Processing..."
                                ) : (
                                  <>
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Buy
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
