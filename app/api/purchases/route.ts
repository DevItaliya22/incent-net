import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const purchaseSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity = 1 } = purchaseSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { wallet: true },
    });

    const totalPrice = product.price * quantity;

    if (!user || user.wallet < totalPrice) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      ...Array.from({ length: quantity }).map(() =>
        prisma.purchase.create({
          data: {
            userId: session.user.id,
            productId,
          },
        })
      ),
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          wallet: { decrement: totalPrice },
        },
      }),
    ]);

    return NextResponse.json({ message: "Product purchased successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.format().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;

    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const purchasesWithQuantity = purchases.reduce((acc, purchase) => {
      const productId = purchase.productId;
      if (acc[productId]) {
        acc[productId].quantity += 1;
        acc[productId].purchases.push(purchase);
      } else {
        acc[productId] = {
          product: purchase.product,
          quantity: 1,
          purchases: [purchase],
        };
      }
      return acc;
    }, {} as Record<string, { product: (typeof purchases)[0]["product"]; quantity: number; purchases: typeof purchases }>);

    return NextResponse.json(Object.values(purchasesWithQuantity));
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
