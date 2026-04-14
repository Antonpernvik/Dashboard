"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Project, CATEGORY_LABELS, ProjectCategory } from "@/lib/types";
import {
  LayoutDashboard, Sun, Building2, Dumbbell, Wrench,
  Monitor, UtensilsCrossed, Shield, MoreHorizontal,
  ListTodo, GanttChart, Users, Bot,   FolderKanban,
  Wifi, WifiOff,
  Users2,
} from "lucide-react";

const CATEGORY_ICONS: Record<ProjectCategory, React.ReactNode> = {
  energi: <Sun size={14} />,
  bygg: <Building2 size={14} />,
  gym: <Dumbbell size={14} />,
  drift: <Wrench size={14} />,
  it: <Monitor size={14} />,
  hospitality: <UtensilsCrossed size={14} />,
  admin: <Shield size={14} />,
  ovrigt: <MoreHorizontal size={14} />,
};

const NAV_ITEMS = [
  { href: "/", label: "Uppgifter", icon: ListTodo },
  { href: "/projects", label: "Projekt", icon: FolderKanban },
  { href: "/timeline", label: "Tidslinje", icon: GanttChart },
  { href: "/contacts", label: "Kontakter", icon: Users },
  { href: "/agents", label: "Agenter", icon: Users2 },
];

interface SidebarProps {
  projects: Project[];
  selectedProject: string | null;
  onSelectProject: (id: string | null) => void;
  taskCounts: Record<string, number>;
}

interface JarvisStatus {
  online: boolean;
  model?: string;
}

export default function Sidebar({
  projects,
  selectedProject,
  onSelectProject,
  taskCounts,
}: SidebarProps) {
  const pathname = usePathname();
  const [jarvis, setJarvis] = useState<JarvisStatus | null>(null);

  // Pollar Jarvis-status var 30:e sekund
  useEffect(() => {
    function checkStatus() {
      fetch("/api/jarvis/status")
        .then((r) => r.json())
        .then((d) => setJarvis({ online: d.online, model: d.model }))
        .catch(() => setJarvis({ online: false }));
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  const grouped = projects.reduce<Record<ProjectCategory, Project[]>>(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {} as Record<ProjectCategory, Project[]>
  );

  const categoryOrder: ProjectCategory[] = [
    "energi", "bygg", "gym", "it", "drift",
    "hospitality", "admin", "ovrigt",
  ];

  const totalTasks = Object.values(taskCounts).reduce((s, c) => s + c, 0);

  return (
    <aside className="w-[280px] h-screen bg-white border-r border-sand-dark flex flex-col shrink-0">
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-display text-stone-dark tracking-tight">
          Sibbjäns Ops
        </h1>
        <p className="text-xs text-stone mt-0.5 font-mono">operativ dashboard</p>
      </div>

      <nav className="px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-sea/10 text-sea font-medium"
                  : "text-stone-dark hover:bg-sand-dark"
              }`}
            >
              <item.icon size={15} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Jarvis-länk med live status-indikator */}
        <Link
          href="/agent"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/agent"
              ? "bg-sea/10 text-sea font-medium"
              : "text-stone-dark hover:bg-sand-dark"
          }`}
        >
          <Bot size={15} />
          <span>Jarvis</span>
          {jarvis !== null && (
            <span className="ml-auto">
              {jarvis.online ? (
                <span className="w-2 h-2 rounded-full bg-moss block" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-stone-light block" />
              )}
            </span>
          )}
        </Link>
      </nav>

      <div className="border-t border-sand-dark mx-3 my-2" />

      <div className="px-3">
        <button
          onClick={() => onSelectProject(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedProject === null
              ? "bg-sand-dark text-stone-dark font-medium"
              : "text-stone-dark hover:bg-sand-dark"
          }`}
        >
          <LayoutDashboard size={15} />
          <span>Alla projekt</span>
          <span className="ml-auto text-xs font-mono text-stone">{totalTasks}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4">
        {categoryOrder.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="flex items-center gap-1.5 px-3 mb-1">
                <span className="text-stone">{CATEGORY_ICONS[cat]}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone">
                  {CATEGORY_LABELS[cat]}
                </span>
              </div>
              {items.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    selectedProject === project.id
                      ? "bg-sea/10 text-sea font-medium"
                      : "text-stone-dark hover:bg-sand-dark"
                  }`}
                >
                  <span className="truncate">{project.name}</span>
                  {(taskCounts[project.id] ?? 0) > 0 && (
                    <span className="ml-auto text-xs font-mono text-stone">
                      {taskCounts[project.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Jarvis statusrad längst ner */}
      <div className="px-4 py-3 border-t border-sand-dark">
        {jarvis === null ? (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-light animate-pulse" />
            <span className="text-[10px] font-mono text-stone">kollar jarvis...</span>
          </div>
        ) : jarvis.online ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi size={11} className="text-moss" />
              <span className="text-[10px] font-mono text-moss">Jarvis online</span>
            </div>
            <span className="text-[10px] font-mono text-stone truncate max-w-[120px]">
              {jarvis.model?.replace("anthropic/", "") || "sonnet-4-6"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WifiOff size={11} className="text-stone-light" />
            <span className="text-[10px] font-mono text-stone">Jarvis offline</span>
          </div>
        )}
      </div>
    </aside>
  );
}
