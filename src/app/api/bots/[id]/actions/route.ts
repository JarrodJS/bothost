import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDeploymentService } from "@/modules/bots/services/deployment-service";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["start", "stop", "restart", "deploy"]),
});

export async function POST(
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
    const { action } = actionSchema.parse(body);

    const deploymentService = getDeploymentService();

    switch (action) {
      case "start":
        await deploymentService.startBot(id, session.user.id);
        return NextResponse.json({ success: true, message: "Bot started" });

      case "stop":
        await deploymentService.stopBot(id, session.user.id);
        return NextResponse.json({ success: true, message: "Bot stopped" });

      case "restart":
        await deploymentService.restartBot(id, session.user.id);
        return NextResponse.json({ success: true, message: "Bot restarted" });

      case "deploy":
        const deploymentId = await deploymentService.deployBot({
          botId: id,
          userId: session.user.id,
        });
        return NextResponse.json({
          success: true,
          message: "Deployment started",
          deploymentId,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Bot action failed:", error);

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
      { error: "Action failed" },
      { status: 500 }
    );
  }
}
