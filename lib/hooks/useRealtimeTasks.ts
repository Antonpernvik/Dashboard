"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Task, TaskWithRelations } from "@/lib/types";

interface UseRealtimeTasksReturn {
  tasks: TaskWithRelations[];
  setTasks: React.Dispatch<React.SetStateAction<TaskWithRelations[]>>;
  optimisticUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  optimisticInsert: (data: Partial<Task>) => Promise<void>;
  optimisticDelete: (taskId: string) => Promise<void>;
  refetch: () => Promise<void>;
  externallyUpdated: Set<string>;
}

const TASK_SELECT = "*, projects(id, name, category), contacts(id, name, company)";

export function useRealtimeTasks(
  initialTasks: TaskWithRelations[],
  supabase: SupabaseClient,
  toastFn?: (msg: string, type?: "success" | "error" | "info") => void
): UseRealtimeTasksReturn {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [externallyUpdated, setExternallyUpdated] = useState<Set<string>>(new Set());
  const pendingMutations = useRef<Set<string>>(new Set());
  const externalTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("created_at", { ascending: false });
    if (data) setTasks(data as TaskWithRelations[]);
  }, [supabase]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const id = (payload.old as any)?.id || (payload.new as any)?.id;

          if (id && pendingMutations.current.has(id)) {
            pendingMutations.current.delete(id);
            return;
          }

          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("tasks")
              .select(TASK_SELECT)
              .eq("id", (payload.new as any).id)
              .single();
            if (data) {
              setTasks((prev) => [data as TaskWithRelations, ...prev]);
              markExternal((payload.new as any).id);
            }
          } else if (payload.eventType === "UPDATE") {
            const taskId = (payload.new as any).id;
            const { data } = await supabase
              .from("tasks")
              .select(TASK_SELECT)
              .eq("id", taskId)
              .single();
            if (data) {
              setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? (data as TaskWithRelations) : t))
              );
              markExternal(taskId);
            }
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  function markExternal(taskId: string) {
    setExternallyUpdated((prev) => new Set(prev).add(taskId));
    const existing = externalTimers.current.get(taskId);
    if (existing) clearTimeout(existing);
    externalTimers.current.set(
      taskId,
      setTimeout(() => {
        setExternallyUpdated((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        externalTimers.current.delete(taskId);
      }, 2000)
    );
  }

  const optimisticUpdate = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      pendingMutations.current.add(taskId);
      const snapshot = tasks.find((t) => t.id === taskId);

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );

      const { projects: _p, contacts: _c, ...dbUpdates } = updates as any;
      const { error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", taskId);

      if (error) {
        if (snapshot) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? snapshot : t))
          );
        }
        toastFn?.(`Kunde inte spara: ${error.message}`, "error");
        pendingMutations.current.delete(taskId);
      }
    },
    [supabase, tasks, toastFn]
  );

  const optimisticInsert = useCallback(
    async (data: Partial<Task>) => {
      const tempId = crypto.randomUUID();
      pendingMutations.current.add(tempId);

      const { error } = await supabase.from("tasks").insert(data);

      if (error) {
        toastFn?.(`Kunde inte skapa: ${error.message}`, "error");
      }
      pendingMutations.current.delete(tempId);
      await refetch();
    },
    [supabase, toastFn, refetch]
  );

  const optimisticDelete = useCallback(
    async (taskId: string) => {
      pendingMutations.current.add(taskId);
      const snapshot = tasks.find((t) => t.id === taskId);

      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) {
        if (snapshot) {
          setTasks((prev) => [...prev, snapshot]);
        }
        toastFn?.(`Kunde inte radera: ${error.message}`, "error");
        pendingMutations.current.delete(taskId);
      }
    },
    [supabase, tasks, toastFn]
  );

  return {
    tasks,
    setTasks,
    optimisticUpdate,
    optimisticInsert,
    optimisticDelete,
    refetch,
    externallyUpdated,
  };
}
