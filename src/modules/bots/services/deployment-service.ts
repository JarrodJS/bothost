import { db } from "@/lib/db";
import { getCoolifyClient } from "@/lib/coolify/client";
import { Bot, BotStatus, BotRuntime } from "@prisma/client";

interface DeployBotOptions {
  botId: string;
  userId: string;
}

interface CreateBotOptions {
  userId: string;
  name: string;
  description?: string;
  platform: "DISCORD" | "TELEGRAM";
  runtime: BotRuntime;
  source: "GITHUB" | "UPLOAD" | "TEMPLATE";
  githubRepo?: string;
  githubBranch?: string;
  templateId?: string;
  envVars?: Record<string, string>;
}

export class DeploymentService {
  private coolify = getCoolifyClient();

  // Create a new bot
  async createBot(options: CreateBotOptions): Promise<Bot> {
    // Get user's subscription to check limits
    const subscription = await db.subscription.findUnique({
      where: { userId: options.userId },
    });

    const tierLimits = {
      FREE: { bots: 1, memory: 128 },
      HOBBY: { bots: 3, memory: 256 },
      PRO: { bots: 10, memory: 512 },
      ENTERPRISE: { bots: 50, memory: 1024 },
    };

    const limits = tierLimits[subscription?.tier ?? "FREE"];

    // Check bot count limit
    const botCount = await db.bot.count({
      where: { userId: options.userId },
    });

    if (botCount >= limits.bots) {
      throw new Error(
        `Bot limit reached. Upgrade your subscription to create more bots.`
      );
    }

    // Create bot record
    const bot = await db.bot.create({
      data: {
        userId: options.userId,
        name: options.name,
        description: options.description,
        platform: options.platform,
        runtime: options.runtime,
        source: options.source,
        githubRepo: options.githubRepo,
        githubBranch: options.githubBranch ?? "main",
        templateId: options.templateId,
        memoryLimit: limits.memory,
        cpuLimit: 0.25,
        status: "STOPPED",
      },
    });

    // Create Coolify application
    try {
      const app = await this.coolify.createApplication({
        name: `bothost-${bot.id}`,
        runtime: options.runtime,
        githubRepo: options.githubRepo,
        githubBranch: options.githubBranch,
        envVars: options.envVars,
      });

      // Update bot with Coolify UUID
      await db.bot.update({
        where: { id: bot.id },
        data: {
          coolifyAppUuid: app.uuid,
        },
      });

      // Store environment variables
      if (options.envVars) {
        for (const [key, value] of Object.entries(options.envVars)) {
          await db.botEnvVar.create({
            data: {
              botId: bot.id,
              key,
              value, // Should be encrypted in production
              isSecret: key.toLowerCase().includes("token") || key.toLowerCase().includes("secret"),
            },
          });
        }
      }

      return bot;
    } catch (error) {
      // Cleanup bot record if Coolify creation fails
      await db.bot.delete({ where: { id: bot.id } });
      throw error;
    }
  }

  // Deploy a bot
  async deployBot(options: DeployBotOptions): Promise<string> {
    const bot = await db.bot.findFirst({
      where: {
        id: options.botId,
        userId: options.userId,
      },
    });

    if (!bot) {
      throw new Error("Bot not found");
    }

    if (!bot.coolifyAppUuid) {
      throw new Error("Bot has no associated Coolify application");
    }

    // Update bot status
    await db.bot.update({
      where: { id: bot.id },
      data: { status: "DEPLOYING" },
    });

    // Create deployment record
    const deployment = await db.deployment.create({
      data: {
        botId: bot.id,
        status: "PENDING",
        startedAt: new Date(),
      },
    });

    try {
      // Trigger deployment in Coolify
      await this.coolify.deployApplication(bot.coolifyAppUuid);

      // Update deployment status
      await db.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "DEPLOYING",
        },
      });

      return deployment.id;
    } catch (error) {
      await db.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          logs: error instanceof Error ? error.message : "Unknown error",
        },
      });

      await db.bot.update({
        where: { id: bot.id },
        data: { status: "FAILED" },
      });

      throw error;
    }
  }

  // Start a bot
  async startBot(botId: string, userId: string): Promise<void> {
    const bot = await this.getBot(botId, userId);

    if (!bot.coolifyAppUuid) {
      throw new Error("Bot has no associated Coolify application");
    }

    await this.coolify.startApplication(bot.coolifyAppUuid);

    await db.bot.update({
      where: { id: bot.id },
      data: {
        status: "RUNNING",
        lastStartedAt: new Date(),
      },
    });
  }

  // Stop a bot
  async stopBot(botId: string, userId: string): Promise<void> {
    const bot = await this.getBot(botId, userId);

    if (!bot.coolifyAppUuid) {
      throw new Error("Bot has no associated Coolify application");
    }

    await this.coolify.stopApplication(bot.coolifyAppUuid);

    await db.bot.update({
      where: { id: bot.id },
      data: { status: "STOPPED" },
    });
  }

  // Restart a bot
  async restartBot(botId: string, userId: string): Promise<void> {
    const bot = await this.getBot(botId, userId);

    if (!bot.coolifyAppUuid) {
      throw new Error("Bot has no associated Coolify application");
    }

    await this.coolify.restartApplication(bot.coolifyAppUuid);

    await db.bot.update({
      where: { id: bot.id },
      data: {
        status: "RUNNING",
        lastStartedAt: new Date(),
      },
    });
  }

  // Delete a bot
  async deleteBot(botId: string, userId: string): Promise<void> {
    const bot = await this.getBot(botId, userId);

    if (bot.coolifyAppUuid) {
      try {
        await this.coolify.deleteApplication(bot.coolifyAppUuid);
      } catch (error) {
        console.error("Failed to delete Coolify application:", error);
      }
    }

    await db.bot.delete({ where: { id: bot.id } });
  }

  // Get bot logs
  async getBotLogs(botId: string, userId: string, lines = 100): Promise<string[]> {
    const bot = await this.getBot(botId, userId);

    if (!bot.coolifyAppUuid) {
      throw new Error("Bot has no associated Coolify application");
    }

    return this.coolify.getApplicationLogs(bot.coolifyAppUuid, lines);
  }

  // Update environment variables
  async updateEnvVars(
    botId: string,
    userId: string,
    envVars: Record<string, string>
  ): Promise<void> {
    const bot = await this.getBot(botId, userId);

    if (!bot.coolifyAppUuid) {
      throw new Error("Bot has no associated Coolify application");
    }

    // Update in Coolify
    await this.coolify.setEnvironmentVariables(bot.coolifyAppUuid, envVars);

    // Update in database
    for (const [key, value] of Object.entries(envVars)) {
      await db.botEnvVar.upsert({
        where: {
          botId_key: {
            botId,
            key,
          },
        },
        update: { value },
        create: {
          botId,
          key,
          value,
          isSecret: key.toLowerCase().includes("token") || key.toLowerCase().includes("secret"),
        },
      });
    }
  }

  // Sync bot status with Coolify
  async syncBotStatus(botId: string, userId: string): Promise<BotStatus> {
    const bot = await this.getBot(botId, userId);

    if (!bot.coolifyAppUuid) {
      return bot.status;
    }

    try {
      const status = await this.coolify.getApplicationStatus(bot.coolifyAppUuid);

      let newStatus: BotStatus = "STOPPED";
      if (status.container_status === "running") {
        newStatus = "RUNNING";
      } else if (status.container_status === "exited") {
        newStatus = "STOPPED";
      } else if (status.status === "building") {
        newStatus = "BUILDING";
      } else if (status.status === "deploying") {
        newStatus = "DEPLOYING";
      }

      if (newStatus !== bot.status) {
        await db.bot.update({
          where: { id: bot.id },
          data: { status: newStatus },
        });
      }

      return newStatus;
    } catch {
      return bot.status;
    }
  }

  private async getBot(botId: string, userId: string): Promise<Bot> {
    const bot = await db.bot.findFirst({
      where: {
        id: botId,
        userId,
      },
    });

    if (!bot) {
      throw new Error("Bot not found");
    }

    return bot;
  }
}

// Singleton instance
let deploymentService: DeploymentService | null = null;

export function getDeploymentService(): DeploymentService {
  if (!deploymentService) {
    deploymentService = new DeploymentService();
  }
  return deploymentService;
}
