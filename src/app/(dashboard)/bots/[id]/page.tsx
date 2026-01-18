import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { BotHeader } from "@/components/bots/bot-header";
import { BotTabs } from "@/components/bots/bot-tabs";

interface BotPageProps {
  params: Promise<{ id: string }>;
}

export default async function BotPage({ params }: BotPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
          value: true,
          isSecret: true,
        },
      },
      deployments: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!bot) {
    notFound();
  }

  // Mask secret values for display
  const maskedEnvVars = bot.envVars.map((env) => ({
    ...env,
    value: env.isSecret ? "••••••••" : env.value,
  }));

  return (
    <div className="space-y-6">
      <BotHeader bot={bot} />
      <BotTabs
        bot={{ ...bot, envVars: maskedEnvVars }}
      />
    </div>
  );
}
