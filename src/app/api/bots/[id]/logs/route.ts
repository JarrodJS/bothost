import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDeploymentService } from "@/modules/bots/services/deployment-service";

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
    const { searchParams } = new URL(req.url);
    const lines = parseInt(searchParams.get("lines") ?? "100", 10);

    const deploymentService = getDeploymentService();
    const logs = await deploymentService.getBotLogs(id, session.user.id, lines);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);

    if (error instanceof Error && error.message === "Bot not found") {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
