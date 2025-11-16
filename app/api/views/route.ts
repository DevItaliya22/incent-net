import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const viewSchema = z.object({
  postId: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = viewSchema.parse(body);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId === session.user.id) {
      return NextResponse.json({ viewed: true });
    }

    const existingView = await prisma.view.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId,
        },
      },
    });

    if (existingView) {
      return NextResponse.json({ viewed: true });
    }

    await prisma.view.create({
      data: {
        userId: session.user.id,
        postId,
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        viewsCount: { increment: 1 },
      },
    });

    return NextResponse.json({ viewed: true });
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
