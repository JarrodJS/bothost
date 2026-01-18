"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Trash2 } from "lucide-react";

interface LogViewerProps {
  botId: string;
}

export function LogViewer({ botId }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bots/${botId}/logs?lines=200`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        // Auto-scroll to bottom
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleDownload = () => {
    const content = logs.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bot-${botId}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Stop Auto-refresh" : "Auto-refresh"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLogs([])}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div
        ref={logContainerRef}
        className="h-[400px] overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-500">No logs available</p>
        ) : (
          logs.map((line, index) => (
            <div key={index} className="text-zinc-300 whitespace-pre-wrap">
              {formatLogLine(line)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatLogLine(line: string): React.ReactNode {
  // Color-code log levels
  if (line.includes("ERROR") || line.includes("error")) {
    return <span className="text-red-400">{line}</span>;
  }
  if (line.includes("WARN") || line.includes("warn")) {
    return <span className="text-yellow-400">{line}</span>;
  }
  if (line.includes("INFO") || line.includes("info")) {
    return <span className="text-blue-400">{line}</span>;
  }
  if (line.includes("DEBUG") || line.includes("debug")) {
    return <span className="text-zinc-500">{line}</span>;
  }
  return line;
}
