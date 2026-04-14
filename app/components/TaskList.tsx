"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  TaskWithRelations,
  TaskStatus,
  Contact,
  STATUS_LABELS,
} from "@/lib/types";
import {
  STATUS_ORDER,
  groupTasksByStatus,
  getStatusColor,
} from "@/lib/utils";
import TaskCard from "./TaskCard";
import { GripVertical } from "lucide-react";

interface TaskListProps {
  tasks: TaskWithRelations[];
  contacts: Contact[];
  selectedStatus: TaskStatus | null;
  onStatusAdvance: (taskId: string) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskWithRelations>) => void;
  onDeleteTask: (taskId: string) => void;
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  externallyUpdated?: Set<string>;
}

function SortableTask({
  task,
  contacts,
  onStatusAdvance,
  onTaskClick,
  onUpdateTask,
  onDeleteTask,
  isExternallyUpdated,
}: {
  task: TaskWithRelations;
  contacts: Contact[];
  onStatusAdvance: (taskId: string) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskWithRelations>) => void;
  onDeleteTask: (taskId: string) => void;
  isExternallyUpdated?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard
        task={task}
        contacts={contacts}
        onStatusAdvance={onStatusAdvance}
        onClick={onTaskClick}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        isExternallyUpdated={isExternallyUpdated}
        dragHandle={
          <button
            {...listeners}
            className="pt-1 text-stone opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </button>
        }
      />
    </div>
  );
}

function DroppableColumn({
  status,
  children,
  taskIds,
}: {
  status: TaskStatus;
  children: React.ReactNode;
  taskIds: string[];
}) {
  return (
    <SortableContext
      items={taskIds}
      strategy={verticalListSortingStrategy}
      id={status}
    >
      {children}
    </SortableContext>
  );
}

export default function TaskList({
  tasks,
  contacts,
  selectedStatus,
  onStatusAdvance,
  onTaskClick,
  onUpdateTask,
  onDeleteTask,
  onDrop,
  externallyUpdated,
}: TaskListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const statuses = selectedStatus ? [selectedStatus] : STATUS_ORDER;

  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId) || null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    // handled in dragEnd
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTaskData = tasks.find((t) => t.id === active.id);
    if (!activeTaskData) return;

    let targetStatus: TaskStatus | null = null;

    if (STATUS_ORDER.includes(over.id as TaskStatus)) {
      targetStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && targetStatus !== activeTaskData.status) {
      onDrop(activeTaskData.id, targetStatus);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {statuses.map((status) => {
          const items = grouped.get(status) || [];
          if (items.length === 0 && selectedStatus === null && !activeId)
            return null;

          const taskIds = items.map((t) => t.id);

          return (
            <section key={status}>
              <div className="flex items-center gap-2 mb-2.5">
                <h3
                  className={`text-sm font-semibold uppercase tracking-wide ${getStatusColor(status)}`}
                >
                  {STATUS_LABELS[status]}
                </h3>
                <span className="text-xs font-mono text-stone bg-sand-dark px-1.5 py-0.5 rounded">
                  {items.length}
                </span>
              </div>

              <DroppableColumn status={status} taskIds={taskIds}>
                {items.length === 0 ? (
                  <div className="border-2 border-dashed border-sand-dark rounded-lg py-4 text-center text-sm text-stone italic">
                    Dra hit för att ändra status
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((task) => (
                      <SortableTask
                        key={task.id}
                        task={task}
                        contacts={contacts}
                        onStatusAdvance={onStatusAdvance}
                        onTaskClick={onTaskClick}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        isExternallyUpdated={externallyUpdated?.has(task.id)}
                      />
                    ))}
                  </div>
                )}
              </DroppableColumn>
            </section>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="opacity-90 shadow-lg rotate-1 scale-105">
            <TaskCard
              task={activeTask}
              contacts={contacts}
              onStatusAdvance={() => {}}
              onClick={() => {}}
              onUpdateTask={() => {}}
              onDeleteTask={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
