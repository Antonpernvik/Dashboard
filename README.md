# Sibbjäns Ops

Operativ dashboard för Sibbjäns — projekt, kontakter och uppgifter.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (gotländsk färgpalett)
- **Supabase** (Postgres + RLS)
- **Deploy**: Vercel

## Setup

### 1. Klona och installera

```bash
npm install
```

### 2. Supabase

Skapa ett nytt Supabase-projekt på [supabase.com](https://supabase.com).

Kör schemat i SQL Editor:

```bash
# Öppna supabase/schema.sql och kör hela filen i Supabase SQL Editor
```

Schemat skapar:
- 3 tabeller: `projects`, `contacts`, `tasks`
- Enums för status, prioritet, kategori, roll
- Indexes på tasks
- Öppna RLS-policies (lås ner vid auth-implementation)
- Seed-data: 10 projekt, 18 kontakter, 12 uppgifter

### 3. Miljövariabler

```bash
cp .env.local.example .env.local
```

Fyll i dina Supabase-credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://ditt-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-anon-key
```

### 4. Starta

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## API

REST-API för framtida Claude MCP-integration:

| Metod  | Endpoint            | Beskrivning                        |
|--------|---------------------|------------------------------------|
| GET    | `/api/tasks`        | Lista tasks (filter: status, project_id, priority, assigned_to) |
| POST   | `/api/tasks`        | Skapa ny task                      |
| PATCH  | `/api/tasks/[id]`   | Uppdatera task                     |
| DELETE | `/api/tasks/[id]`   | Ta bort task                       |

### Exempel

```bash
# Hämta alla tasks med status "pagar"
curl "http://localhost:3000/api/tasks?status=pagar"

# Skapa en ny task
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title": "Ny uppgift", "priority": "hog", "status": "att_gora"}'
```

## Design

Gotländsk/naturlig färgpalett:
- **Sand** `#faf9f6` — bakgrund
- **Stone** `#8b8578` — neutral text
- **Sea** `#4a6d7c` — primär accent
- **Moss** `#5a6e4e` — klar/framgång
- **Amber** `#c4973b` — väntar/varning
- **Rust** `#a15d3a` — försenad/kritisk

Typsnitt: DM Serif Display (rubriker), DM Sans (body), JetBrains Mono (mono).
