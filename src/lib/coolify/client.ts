import { BotRuntime } from "@prisma/client";

interface CoolifyConfig {
  apiUrl: string;
  apiToken: string;
  projectUuid: string;
  serverUuid: string;
}

interface ApplicationCreateRequest {
  name: string;
  project_uuid: string;
  server_uuid: string;
  environment_name?: string;
  git_repository?: string;
  git_branch?: string;
  build_pack?: string;
  docker_compose_location?: string;
  dockerfile?: string;
  ports_exposes?: string;
  instant_deploy?: boolean;
}

interface ApplicationResponse {
  uuid: string;
  id: number;
  name: string;
  status: string;
  fqdn?: string;
}

interface DeployResponse {
  deployment_uuid: string;
  message: string;
}

interface LogsResponse {
  logs: string[];
}

export class CoolifyClient {
  private config: CoolifyConfig;

  constructor(config?: Partial<CoolifyConfig>) {
    this.config = {
      apiUrl: config?.apiUrl ?? process.env.COOLIFY_API_URL!,
      apiToken: config?.apiToken ?? process.env.COOLIFY_API_TOKEN!,
      projectUuid: config?.projectUuid ?? process.env.COOLIFY_PROJECT_UUID!,
      serverUuid: config?.serverUuid ?? process.env.COOLIFY_SERVER_UUID!,
    };
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}/api/v1${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Coolify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Create a new application (bot container)
  async createApplication(params: {
    name: string;
    runtime: BotRuntime;
    githubRepo?: string;
    githubBranch?: string;
    envVars?: Record<string, string>;
  }): Promise<ApplicationResponse> {
    const dockerfile = this.generateDockerfile(params.runtime);

    const createParams: ApplicationCreateRequest = {
      name: params.name,
      project_uuid: this.config.projectUuid,
      server_uuid: this.config.serverUuid,
      environment_name: "production",
      build_pack: "dockerfile",
      dockerfile,
      instant_deploy: false,
    };

    if (params.githubRepo) {
      createParams.git_repository = `https://github.com/${params.githubRepo}`;
      createParams.git_branch = params.githubBranch ?? "main";
    }

    const app = await this.fetch<ApplicationResponse>("/applications", {
      method: "POST",
      body: JSON.stringify(createParams),
    });

    // Set environment variables if provided
    if (params.envVars && Object.keys(params.envVars).length > 0) {
      await this.setEnvironmentVariables(app.uuid, params.envVars);
    }

    // Set resource limits
    await this.setResourceLimits(app.uuid, {
      memory: 128,
      cpu: 0.25,
    });

    return app;
  }

  // Deploy an application
  async deployApplication(uuid: string): Promise<DeployResponse> {
    return this.fetch<DeployResponse>(`/applications/${uuid}/deploy`, {
      method: "POST",
    });
  }

  // Start an application
  async startApplication(uuid: string): Promise<void> {
    await this.fetch(`/applications/${uuid}/start`, {
      method: "POST",
    });
  }

  // Stop an application
  async stopApplication(uuid: string): Promise<void> {
    await this.fetch(`/applications/${uuid}/stop`, {
      method: "POST",
    });
  }

  // Restart an application
  async restartApplication(uuid: string): Promise<void> {
    await this.fetch(`/applications/${uuid}/restart`, {
      method: "POST",
    });
  }

  // Delete an application
  async deleteApplication(uuid: string): Promise<void> {
    await this.fetch(`/applications/${uuid}`, {
      method: "DELETE",
    });
  }

  // Get application status
  async getApplicationStatus(
    uuid: string
  ): Promise<{ status: string; container_status: string }> {
    const app = await this.fetch<ApplicationResponse>(
      `/applications/${uuid}`
    );
    return {
      status: app.status,
      container_status: app.status,
    };
  }

  // Get application logs
  async getApplicationLogs(uuid: string, lines = 100): Promise<string[]> {
    const response = await this.fetch<LogsResponse>(
      `/applications/${uuid}/logs?lines=${lines}`
    );
    return response.logs;
  }

  // Set environment variables
  async setEnvironmentVariables(
    uuid: string,
    envVars: Record<string, string>
  ): Promise<void> {
    for (const [key, value] of Object.entries(envVars)) {
      await this.fetch(`/applications/${uuid}/envs`, {
        method: "POST",
        body: JSON.stringify({
          key,
          value,
          is_build_time: false,
        }),
      });
    }
  }

  // Update a specific environment variable
  async updateEnvironmentVariable(
    uuid: string,
    key: string,
    value: string
  ): Promise<void> {
    await this.fetch(`/applications/${uuid}/envs`, {
      method: "PATCH",
      body: JSON.stringify({
        key,
        value,
      }),
    });
  }

  // Set resource limits
  async setResourceLimits(
    uuid: string,
    limits: { memory: number; cpu: number }
  ): Promise<void> {
    await this.fetch(`/applications/${uuid}`, {
      method: "PATCH",
      body: JSON.stringify({
        limits_memory: `${limits.memory}M`,
        limits_cpus: limits.cpu.toString(),
        limits_memory_swap: `${limits.memory * 2}M`,
        limits_memory_swappiness: "60",
      }),
    });
  }

  // Update Dockerfile for an application
  async updateDockerfile(uuid: string, dockerfile: string): Promise<void> {
    await this.fetch(`/applications/${uuid}`, {
      method: "PATCH",
      body: JSON.stringify({
        dockerfile,
      }),
    });
  }

  // Update GitHub repository settings
  async updateGitSettings(
    uuid: string,
    settings: {
      repository?: string;
      branch?: string;
    }
  ): Promise<void> {
    const body: Record<string, string> = {};
    if (settings.repository) {
      body.git_repository = `https://github.com/${settings.repository}`;
    }
    if (settings.branch) {
      body.git_branch = settings.branch;
    }

    await this.fetch(`/applications/${uuid}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // Generate Dockerfile based on runtime
  private generateDockerfile(runtime: BotRuntime): string {
    const dockerfiles: Record<BotRuntime, string> = {
      NODEJS_20: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "index.js"]`,
      NODEJS_18: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "index.js"]`,
      PYTHON_311: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]`,
      PYTHON_310: `FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]`,
    };

    return dockerfiles[runtime];
  }
}

// Singleton instance
let coolifyClient: CoolifyClient | null = null;

export function getCoolifyClient(): CoolifyClient {
  if (!coolifyClient) {
    coolifyClient = new CoolifyClient();
  }
  return coolifyClient;
}
