import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDeploymentService } from "@/modules/bots/services/deployment-service";
import { z } from "zod";

const updateBotSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  githubBranch: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const bot = await db.bot.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        envVars: {
          select: {
            id: true,
            key: true,
            isSecret: true,
            // Don't include value for secrets
          },
        },
        deployments: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    return NextResponse.json(bot);
  } catch (error) {
    console.error("Failed to fetch bot:", error);
    return NextResponse.json({ error: "Failed to fetch bot" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateBotSchema.parse(body);

    const bot = await db.bot.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const updatedBot = await db.bot.update({
      where: { id },
      data,
    });

    return NextResponse.json(updatedBot);
  } catch (error) {
    console.error("Failed to update bot:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update bot" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deploymentService = getDeploymentService();

    await deploymentService.deleteBot(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete bot:", error);

    if (error instanceof Error && error.message === "Bot not found") {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete bot" },
      { status: 500 }
    );
  }
}
