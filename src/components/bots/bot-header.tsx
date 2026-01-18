"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, BotStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Play,
  Square,
  RotateCcw,
  Rocket,
  MoreVertical,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";

interface BotHeaderProps {
  bot: Bot;
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

export function BotHeader({ bot }: BotHeaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const status = statusConfig[bot.status];

  const handleAction = async (action: "start" | "stop" | "restart" | "deploy") => {
    setIsLoading(action);
    try {
      const res = await fetch(`/api/bots/${bot.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Action failed");
      }

      toast({
        title: "Success",
        description: `Bot ${action} initiated`,
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = async () => {
    setIsLoading("delete");
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Delete failed");
      }

      toast({
        title: "Success",
        description: "Bot deleted successfully",
      });

      router.push("/bots");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Delete failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
      setShowDeleteDialog(false);
    }
  };

  const isRunning = bot.status === "RUNNING";
  const isBusy = bot.status === "DEPLOYING" || bot.status === "BUILDING";

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bots">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{bot.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {bot.description && (
              <p className="text-muted-foreground mt-1">{bot.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleAction("stop")}
                disabled={isLoading !== null}
              >
                <Square className="mr-2 h-4 w-4" />
                {isLoading === "stop" ? "Stopping..." : "Stop"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction("restart")}
                disabled={isLoading !== null}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {isLoading === "restart" ? "Restarting..." : "Restart"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleAction("start")}
              disabled={isLoading !== null || isBusy}
            >
              <Play className="mr-2 h-4 w-4" />
              {isLoading === "start" ? "Starting..." : "Start"}
            </Button>
          )}

          <Button
            variant="default"
            onClick={() => handleAction("deploy")}
            disabled={isLoading !== null || isBusy}
          >
            <Rocket className="mr-2 h-4 w-4" />
            {isLoading === "deploy" ? "Deploying..." : "Deploy"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/bots/${bot.id}/settings`}>Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Bot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{bot.name}&quot;? This action
              cannot be undone and will permanently delete the bot and all its
              data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading !== null}
            >
              {isLoading === "delete" ? "Deleting..." : "Delete Bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
