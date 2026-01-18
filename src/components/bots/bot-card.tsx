"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, BotStatus, BotPlatform, Deployment } from "@prisma/client";
import { Bot as BotIcon, Github, Upload, LayoutTemplate } from "lucide-react";
import { formatDistanceToNow } from "@/lib/date";

interface BotCardProps {
  bot: Bot & {
    deployments: Deployment[];
  };
}

const statusConfig: Record<
  BotStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" }
> = {
  RUNNING: { label: "Running", variant: "success" },
  STOPPED: { label: "Stopped", variant: "secondary" },
  DEPLOYING: { label: "Deploying", variant: "warning" },
  BUILDING: { label: "Building", variant: "warning" },
  FAILED: { label: "Failed", variant: "destructive" },
};

const platformIcons: Record<BotPlatform, string> = {
  DISCORD: "Discord",
  TELEGRAM: "Telegram",
};

const sourceIcons = {
  GITHUB: Github,
  UPLOAD: Upload,
  TEMPLATE: LayoutTemplate,
};

export function BotCard({ bot }: BotCardProps) {
  const status = statusConfig[bot.status];
  const SourceIcon = sourceIcons[bot.source];
  const lastDeployment = bot.deployments[0];

  return (
    <Link href={`/bots/${bot.id}`}>
      <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{bot.name}</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BotIcon className="h-4 w-4" />
              {platformIcons[bot.platform]}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <SourceIcon className="h-4 w-4" />
              {bot.source === "GITHUB" && bot.githubRepo}
              {bot.source === "UPLOAD" && "File Upload"}
              {bot.source === "TEMPLATE" && "Template"}
            </span>
          </div>
          {bot.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {bot.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{bot.memoryLimit}MB RAM</span>
            {lastDeployment && (
              <span>
                Last deployed {formatDistanceToNow(lastDeployment.createdAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
