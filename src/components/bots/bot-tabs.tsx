"use client";

import { Bot, Deployment } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogViewer } from "@/components/bots/log-viewer";
import { EnvEditor } from "@/components/bots/env-editor";
import { formatDate } from "@/lib/date";
import { Bot as BotIcon, Github, Upload, LayoutTemplate, Clock } from "lucide-react";

interface EnvVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface BotTabsProps {
  bot: Bot & {
    envVars: EnvVar[];
    deployments: Deployment[];
  };
}

const deploymentStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  BUILDING: { label: "Building", variant: "warning" },
  DEPLOYING: { label: "Deploying", variant: "warning" },
  SUCCESS: { label: "Success", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
  CANCELED: { label: "Canceled", variant: "secondary" },
};

export function BotTabs({ bot }: BotTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        <TabsTrigger value="env">Environment</TabsTrigger>
        <TabsTrigger value="deployments">Deployments</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bot Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Platform</span>
                <div className="flex items-center gap-2">
                  <BotIcon className="h-4 w-4" />
                  <span>{bot.platform}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Runtime</span>
                <span>{bot.runtime.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source</span>
                <div className="flex items-center gap-2">
                  {bot.source === "GITHUB" && <Github className="h-4 w-4" />}
                  {bot.source === "UPLOAD" && <Upload className="h-4 w-4" />}
                  {bot.source === "TEMPLATE" && <LayoutTemplate className="h-4 w-4" />}
                  <span>{bot.source}</span>
                </div>
              </div>
              {bot.githubRepo && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Repository</span>
                  <a
                    href={`https://github.com/${bot.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {bot.githubRepo}
                  </a>
                </div>
              )}
              {bot.githubBranch && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span>{bot.githubBranch}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resource Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Memory</span>
                <span>{bot.memoryLimit}MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">CPU</span>
                <span>{bot.cpuLimit} cores</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(bot.createdAt)}</span>
              </div>
              {bot.lastStartedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Started</span>
                  <span>{formatDate(bot.lastStartedAt)}</span>
                </div>
              )}
              {bot.lastDeployedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Deployed</span>
                  <span>{formatDate(bot.lastDeployedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="logs">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <LogViewer botId={bot.id} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="env">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <EnvEditor botId={bot.id} envVars={bot.envVars} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="deployments">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deployment History</CardTitle>
          </CardHeader>
          <CardContent>
            {bot.deployments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No deployments yet
              </p>
            ) : (
              <div className="space-y-4">
                {bot.deployments.map((deployment) => {
                  const status = deploymentStatusConfig[deployment.status];
                  return (
                    <div
                      key={deployment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <div>
                          {deployment.commitSha && (
                            <p className="font-mono text-sm">
                              {deployment.commitSha.slice(0, 7)}
                            </p>
                          )}
                          {deployment.commitMessage && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {deployment.commitMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDate(deployment.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
