import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/constants";
import { z } from "zod";

const likeSchema = z.object({
  postId: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = likeSchema.parse(body);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: session.user.id,
            postId,
          },
        },
      });

      await prisma.post.update({
        where: { id: postId },
        data: {
          likesCount: { decrement: 1 },
        },
      });

      if (post.authorId !== session.user.id) {
        try {
          await prisma.user.update({
            where: { id: post.authorId },
            data: {
              wallet: { decrement: POINTS.LIKE },
            },
          });
        } catch (error) {
          console.error("Error updating wallet for unlike:", error);
        }
      }

      return NextResponse.json({ liked: false });
    }

    await prisma.like.create({
      data: {
        userId: session.user.id,
        postId,
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        likesCount: { increment: 1 },
      },
    });

    if (post.authorId !== session.user.id) {
      try {
        await prisma.user.update({
          where: { id: post.authorId },
          data: {
            wallet: { increment: POINTS.LIKE },
          },
        });
      } catch (error) {
        console.error("Error updating wallet for like:", error);
      }
    }

    return NextResponse.json({ liked: true });
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
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId,
        },
      },
    });

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
