import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/constants";
import { z } from "zod";

const createPostSchema = z.object({
  content: z.string().max(10000).optional(),
  image: z.string().url().optional(),
  parentPostId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, image, parentPostId } = createPostSchema.parse(body);

    if (!content && !image) {
      return NextResponse.json(
        { error: "Post must have content or image" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        content: content || "",
        image: image || null,
        authorId: session.user.id,
        parentPostId: parentPostId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
          },
        },
      },
    });

    if (parentPostId) {
      await prisma.post.update({
        where: { id: parentPostId },
        data: { viewsCount: { increment: 1 } },
      });

      const parentPost = await prisma.post.findUnique({
        where: { id: parentPostId },
        select: { authorId: true },
      });

      if (parentPost && parentPost.authorId !== session.user.id) {
        try {
          await prisma.user.update({
            where: { id: parentPost.authorId },
            data: {
              wallet: { increment: POINTS.COMMENT },
            },
          });
        } catch (error) {
          console.error("Error updating wallet for comment:", error);
        }
      }
    }

    return NextResponse.json(post, { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const parentPostId = searchParams.get("parentPostId");
    const authorId = searchParams.get("authorId");

    const posts = await prisma.post.findMany({
      where: {
        parentPostId: parentPostId ? parentPostId : null,
        ...(authorId && { authorId }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
