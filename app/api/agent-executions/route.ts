import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import type { AgentExecution, ExecutionAgent, Task } from "@/lib/types";

const STATUSES = new Set<AgentExecution["status"]>([
  "started",
  "running",
  "completed",
  "failed",
]);

function isExecutionAgent(v: string): v is ExecutionAgent {
  return (
    v === "leopold" ||
    v === "claude" ||
    v === "jarvis" ||
    v === "system"
  );
}

function embedTask(
  raw: unknown
): Pick<Task, "id" | "title"> | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (
      first &&
      typeof first === "object" &&
      "id" in first &&
      "title" in first
    ) {
      return { id: String(first.id), title: String(first.title) };
    }
    return null;
  }
  if (typeof raw === "object" && "id" in raw && "title" in raw) {
    const o = raw as { id: unknown; title: unknown };
    return { id: String(o.id), title: String(o.title) };
  }
  return null;
}

function parseRow(row: Record<string, unknown>): AgentExecution | null {
  if (typeof row.id !== "string") return null;
  const agentRaw = row.agent;
  if (typeof agentRaw !== "string" || !isExecutionAgent(agentRaw)) {
    return null;
  }
  const statusRaw = row.status;
  const status =
    typeof statusRaw === "string" && STATUSES.has(statusRaw as AgentExecution["status"])
      ? (statusRaw as AgentExecution["status"])
      : ("started" as const);

  const input = row.input;
  const output = row.output;

  return {
    id: row.id,
    task_id: typeof row.task_id === "string" ? row.task_id : null,
    agent: agentRaw,
    action: typeof row.action === "string" ? row.action : "",
    status,
    input:
      input !== null &&
      input !== undefined &&
      typeof input === "object" &&
      !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : null,
    output:
      output !== null &&
      output !== undefined &&
      typeof output === "object" &&
      !Array.isArray(output)
        ? (output as Record<string, unknown>)
        : null,
    error: typeof row.error === "string" ? row.error : null,
    started_at:
      typeof row.started_at === "string" ? row.started_at : new Date().toISOString(),
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
    created_at:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    tasks: embedTask(row.tasks),
  };
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get("agent");
  const limitRaw = Number.parseInt(searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(100, Math.max(1, limitRaw))
    : 50;

  let q = supabase
    .from("agent_executions")
    .select("*, tasks(id, title)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agent) {
    q = q.eq("agent", agent);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: AgentExecution[] = [];
  for (const r of data || []) {
    const parsed = parseRow(r as Record<string, unknown>);
    if (parsed) rows.push(parsed);
  }

  return NextResponse.json(rows);
}
