import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDeploymentService } from "@/modules/bots/services/deployment-service";
import { z } from "zod";

const createBotSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  platform: z.enum(["DISCORD", "TELEGRAM"]),
  runtime: z.enum(["NODEJS_20", "NODEJS_18", "PYTHON_311", "PYTHON_310"]),
  source: z.enum(["GITHUB", "UPLOAD", "TEMPLATE"]),
  githubRepo: z.string().optional(),
  githubBranch: z.string().optional(),
  templateId: z.string().optional(),
  envVars: z.record(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bots = await db.bot.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        deployments: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(bots);
  } catch (error) {
    console.error("Failed to fetch bots:", error);
    return NextResponse.json(
      { error: "Failed to fetch bots" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createBotSchema.parse(body);

    const deploymentService = getDeploymentService();
    const bot = await deploymentService.createBot({
      userId: session.user.id,
      ...data,
    });

    return NextResponse.json(bot, { status: 201 });
  } catch (error) {
    console.error("Failed to create bot:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create bot" },
      { status: 500 }
    );
  }
}
