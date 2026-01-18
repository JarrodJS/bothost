import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BotCard } from "@/components/bots/bot-card";
import { Plus, Bot } from "lucide-react";

export default async function BotsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const tierLimits = {
    FREE: { bots: 1, memory: 128 },
    HOBBY: { bots: 3, memory: 256 },
    PRO: { bots: 10, memory: 512 },
    ENTERPRISE: { bots: 50, memory: 1024 },
  };

  const limits = tierLimits[subscription?.tier ?? "FREE"];
  const canCreateBot = bots.length < limits.bots;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Bots</h1>
          <p className="text-muted-foreground">
            {bots.length} of {limits.bots} bots used
          </p>
        </div>
        {canCreateBot ? (
          <Link href="/bots/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Bot
            </Button>
          </Link>
        ) : (
          <Link href="/billing">
            <Button variant="outline">Upgrade to add more bots</Button>
          </Link>
        )}
      </div>

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Bot className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No bots yet</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Get started by creating your first bot. Deploy from GitHub, upload
            your code, or use a template.
          </p>
          <Link href="/bots/new" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create your first bot
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
    </div>
  );
}
