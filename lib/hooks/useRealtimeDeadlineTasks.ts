"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SupabaseClient,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { Task, TaskWithRelations } from "@/lib/types";

const SELECT =
  "*, projects(id, name, category), contacts(id, name, company)";

function sortByDeadline(a: TaskWithRelations, b: TaskWithRelations): number {
  const da = a.deadline || "";
  const db = b.deadline || "";
  return da.localeCompare(db) || a.title.localeCompare(b.title);
}

interface Return {
  tasks: TaskWithRelations[];
  setTasks: React.Dispatch<React.SetStateAction<TaskWithRelations[]>>;
  optimisticUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  optimisticInsert: (data: Partial<Task>) => Promise<void>;
  optimisticDelete: (taskId: string) => Promise<void>;
  refetch: () => Promise<void>;
  externallyUpdated: Set<string>;
}

/** Realtime + optimistic updates endast för tasks med deadline (kalendervy) */
export function useRealtimeDeadlineTasks(
  initialTasks: TaskWithRelations[],
  supabase: SupabaseClient,
  toastFn?: (msg: string, type?: "success" | "error" | "info") => void
): Return {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(() =>
    [...initialTasks].sort(sortByDeadline)
  );
  const [externallyUpdated, setExternallyUpdated] = useState<Set<string>>(
    new Set()
  );
  const pendingMutations = useRef<Set<string>>(new Set());
  const externalTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(SELECT)
      .not("deadline", "is", null)
      .order("deadline", { ascending: true });
    if (error) {
      toastFn?.(`Kunde inte ladda deadlines: ${error.message}`, "error");
      return;
    }
    if (data) setTasks((data as TaskWithRelations[]).sort(sortByDeadline));
  }, [supabase, toastFn]);

  useEffect(() => {
    const channel = supabase
      .channel("tasks-deadline-calendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const id =
            (payload.old as { id?: string })?.id ||
            (payload.new as { id?: string })?.id;

          if (id && pendingMutations.current.has(id)) {
            pendingMutations.current.delete(id);
            return;
          }

          if (payload.eventType === "INSERT") {
            const newId = (payload.new as { id?: string })?.id;
            if (!newId) return;
            const { data } = await supabase
              .from("tasks")
              .select(SELECT)
              .eq("id", newId)
              .single();
            const row = data as TaskWithRelations | null;
            if (row?.deadline) {
              setTasks((prev) =>
                [...prev.filter((t) => t.id !== row.id), row].sort(
                  sortByDeadline
                )
              );
              markExternal(newId);
            }
          } else if (payload.eventType === "UPDATE") {
            const taskId = (payload.new as { id?: string })?.id;
            if (!taskId) return;
            const { data } = await supabase
              .from("tasks")
              .select(SELECT)
              .eq("id", taskId)
              .single();
            const row = data as TaskWithRelations | null;
            if (!row) return;
            setTasks((prev) => {
              if (!row.deadline) {
                return prev.filter((t) => t.id !== taskId);
              }
              const next = prev.filter((t) => t.id !== taskId);
              next.push(row);
              return next.sort(sortByDeadline);
            });
            markExternal(taskId);
          } else if (payload.eventType === "DELETE") {
            if (id) setTasks((prev) => prev.filter((t) => t.id !== id));
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

      setTasks((prev) => {
        const merged = prev.map((t) =>
          t.id === taskId ? ({ ...t, ...updates } as TaskWithRelations) : t
        );
        return merged
          .filter((t) => (t.id === taskId ? Boolean(t.deadline) : true))
          .sort(sortByDeadline);
      });

      const { projects: _p, contacts: _c, ...dbUpdates } = updates as Record<
        string,
        unknown
      >;
      const { error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", taskId);

      if (error) {
        if (snapshot) {
          setTasks((prev) => {
            const without = prev.filter((t) => t.id !== taskId);
            return [...without, snapshot].sort(sortByDeadline);
          });
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
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) {
        if (snapshot) {
          setTasks((prev) => [...prev, snapshot].sort(sortByDeadline));
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
