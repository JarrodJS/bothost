import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDeploymentService } from "@/modules/bots/services/deployment-service";
import { z } from "zod";

const updateEnvSchema = z.object({
  envVars: z.record(z.string()),
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
        envVars: true,
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Mask secret values
    const envVars = bot.envVars.map((env) => ({
      ...env,
      value: env.isSecret ? "••••••••" : env.value,
    }));

    return NextResponse.json({ envVars });
  } catch (error) {
    console.error("Failed to fetch env vars:", error);
    return NextResponse.json(
      { error: "Failed to fetch environment variables" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { envVars } = updateEnvSchema.parse(body);

    const deploymentService = getDeploymentService();
    await deploymentService.updateEnvVars(id, session.user.id, envVars);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update env vars:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Bot not found") {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update environment variables" },
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
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const bot = await db.bot.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    await db.botEnvVar.delete({
      where: {
        botId_key: {
          botId: id,
          key,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete env var:", error);
    return NextResponse.json(
      { error: "Failed to delete environment variable" },
      { status: 500 }
    );
  }
}
