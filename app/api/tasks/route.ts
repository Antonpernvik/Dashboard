import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("tasks")
    .select("*, projects(id, name, category), contacts(id, name, company)");

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  const projectId = searchParams.get("project_id");
  if (projectId) query = query.eq("project_id", projectId);

  const priority = searchParams.get("priority");
  if (priority) query = query.eq("priority", priority);

  const assignedTo = searchParams.get("assigned_to");
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { title, ...rest } = body;
  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ title, ...rest })
    .select("*, projects(id, name, category), contacts(id, name, company)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
