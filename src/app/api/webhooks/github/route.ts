import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { getDeploymentService } from "@/modules/bots/services/deployment-service";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET not set");
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  return signature === expected;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("x-hub-signature-256");
  const eventType = headersList.get("x-github-event");

  if (signature && !verifySignature(body, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  try {
    const payload = JSON.parse(body);

    // Handle push events for auto-deployment
    if (eventType === "push") {
      const repoFullName = payload.repository?.full_name;
      const branch = payload.ref?.replace("refs/heads/", "");
      const commitSha = payload.after;
      const commitMessage = payload.head_commit?.message;

      if (!repoFullName || !branch) {
        return NextResponse.json({ received: true });
      }

      // Find bots connected to this repo and branch
      const bots = await db.bot.findMany({
        where: {
          source: "GITHUB",
          githubRepo: repoFullName,
          githubBranch: branch,
        },
      });

      const deploymentService = getDeploymentService();

      // Trigger deployment for each matching bot
      for (const bot of bots) {
        try {
          // Create deployment record with commit info
          const deployment = await db.deployment.create({
            data: {
              botId: bot.id,
              status: "PENDING",
              commitSha,
              commitMessage,
              startedAt: new Date(),
            },
          });

          // Update bot status
          await db.bot.update({
            where: { id: bot.id },
            data: {
              status: "DEPLOYING",
              lastDeployedAt: new Date(),
            },
          });

          // Trigger async deployment (don't await)
          deploymentService
            .deployBot({
              botId: bot.id,
              userId: bot.userId,
            })
            .catch((error) => {
              console.error(`Deployment failed for bot ${bot.id}:`, error);
              db.deployment.update({
                where: { id: deployment.id },
                data: {
                  status: "FAILED",
                  finishedAt: new Date(),
                  logs: error.message,
                },
              });
              db.bot.update({
                where: { id: bot.id },
                data: { status: "FAILED" },
              });
            });
        } catch (error) {
          console.error(`Failed to process bot ${bot.id}:`, error);
        }
      }

      return NextResponse.json({
        received: true,
        botsTriggered: bots.length,
      });
    }

    // Handle ping event (webhook test)
    if (eventType === "ping") {
      return NextResponse.json({ message: "Pong!" });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling GitHub webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
