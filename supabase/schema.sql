-- ============================================================
-- Sibbjäns Ops — Supabase Schema
-- ============================================================

-- Enums
CREATE TYPE project_category AS ENUM (
  'energi', 'bygg', 'gym', 'drift', 'it', 'hospitality', 'admin', 'ovrigt'
);

CREATE TYPE project_status AS ENUM ('aktiv', 'pausad', 'klar');

CREATE TYPE contact_role AS ENUM (
  'entreprenor', 'leverantor', 'konsult', 'intern', 'agare'
);

CREATE TYPE task_status AS ENUM (
  'att_gora', 'pagar', 'vantar_pa_svar', 'forsenad', 'klar'
);

CREATE TYPE task_priority AS ENUM ('kritisk', 'hog', 'normal', 'lag');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    project_category NOT NULL DEFAULT 'ovrigt',
  description text,
  status      project_status NOT NULL DEFAULT 'aktiv',
  deadline    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  company      text,
  role         contact_role NOT NULL DEFAULT 'konsult',
  email        text,
  phone        text,
  notes        text,
  last_contact date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  status      task_status NOT NULL DEFAULT 'att_gora',
  priority    task_priority NOT NULL DEFAULT 'normal',
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_to text,
  deadline    date,
  waiting_on  text,
  source      text,
  source_ref  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_tasks_status     ON tasks(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_priority   ON tasks(priority);
CREATE INDEX idx_tasks_deadline   ON tasks(deadline);

-- ============================================================
-- Updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (open for now — lock down when auth is added)
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks"    ON tasks    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: Projects
-- ============================================================

INSERT INTO projects (id, name, category, status, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Sol & Batteri',         'energi',      'aktiv',  'Solceller och batterilagring på Sibbjäns'),
  ('a1000000-0000-0000-0000-000000000002', 'Fentrica EMS',          'energi',      'aktiv',  'Energihanteringssystem via Fentrica'),
  ('a1000000-0000-0000-0000-000000000003', 'Eleiko Utegym',         'gym',         'aktiv',  'Utomhusgym med Eleiko-utrustning'),
  ('a1000000-0000-0000-0000-000000000004', 'Elbilsladdare',         'energi',      'aktiv',  'Laddinfrastruktur för elbilar'),
  ('a1000000-0000-0000-0000-000000000005', 'Ljud & Nätverk',        'it',          'aktiv',  'Ljud- och nätverksinstallation'),
  ('a1000000-0000-0000-0000-000000000006', 'Byggnader HL-AB',       'bygg',        'aktiv',  'Byggnationsprojekt med HL-AB'),
  ('a1000000-0000-0000-0000-000000000007', 'Nore Fastigheter',      'bygg',        'aktiv',  'Fastighetsutveckling Nore'),
  ('a1000000-0000-0000-0000-000000000008', 'Restaurang & Öppning',  'hospitality', 'aktiv',  'Restaurangplanering och öppning'),
  ('a1000000-0000-0000-0000-000000000009', 'Vindkraft EM Wind',     'energi',      'pausad', 'Vindkraftsprojekt med Energy Machines'),
  ('a1000000-0000-0000-0000-000000000010', 'Verbier',               'ovrigt',      'aktiv',  'Verbier-relaterade aktiviteter');

-- ============================================================
-- Seed: Contacts
-- ============================================================

INSERT INTO contacts (id, name, company, role) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Daniel Hellsing',      'HL-AB',            'entreprenor'),
  ('b1000000-0000-0000-0000-000000000002', 'Emil Bogren',          'Bravida',          'entreprenor'),
  ('b1000000-0000-0000-0000-000000000003', 'Oscar Jurhagen',       'Enviment',         'leverantor'),
  ('b1000000-0000-0000-0000-000000000004', 'PJ Fröjelid',          'Right Energy',     'konsult'),
  ('b1000000-0000-0000-0000-000000000005', 'Erik Humlén',          'SellPower',        'leverantor'),
  ('b1000000-0000-0000-0000-000000000006', 'Martin Lindgren',      'SellPower',        'leverantor'),
  ('b1000000-0000-0000-0000-000000000007', 'Gabriella Lanevik',    'Eleiko',           'leverantor'),
  ('b1000000-0000-0000-0000-000000000008', 'My Johansson',         'Eleiko',           'leverantor'),
  ('b1000000-0000-0000-0000-000000000009', 'Lars Åslund',          'SmartHome',        'leverantor'),
  ('b1000000-0000-0000-0000-000000000010', 'Jonas Lindberg',       'BRS Networks',     'leverantor'),
  ('b1000000-0000-0000-0000-000000000011', 'Hendrik Lall',         'Fentrica',         'leverantor'),
  ('b1000000-0000-0000-0000-000000000012', 'Ulf Svahn',            'Unitab',           'leverantor'),
  ('b1000000-0000-0000-0000-000000000013', 'Julia Arnardottir',    'Energy Machines',  'leverantor'),
  ('b1000000-0000-0000-0000-000000000014', 'Maja Berg',            NULL,               'intern'),
  ('b1000000-0000-0000-0000-000000000015', 'Pontus Rönn',          NULL,               'intern'),
  ('b1000000-0000-0000-0000-000000000016', 'Markus Lidman',        'HL-AB',            'entreprenor'),
  ('b1000000-0000-0000-0000-000000000017', 'Jonas Nordlander',     NULL,               'agare'),
  ('b1000000-0000-0000-0000-000000000018', 'Lena von Segebaden',   NULL,               'intern');

-- ============================================================
-- Seed: Tasks
-- ============================================================

INSERT INTO tasks (title, status, priority, project_id, contact_id, assigned_to, deadline, waiting_on, description) VALUES
  (
    'Invänta offert SRS-rör från Enviment',
    'vantar_pa_svar', 'hog',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000003',
    'Leopold', CURRENT_DATE + INTERVAL '2 days',
    'Oscar — SRS-rör svar',
    'Offert på SRS-rör för solcellsinstallation'
  ),
  (
    'Boka slutbesiktning tak',
    'att_gora', 'kritisk',
    'a1000000-0000-0000-0000-000000000006',
    'b1000000-0000-0000-0000-000000000001',
    'Leopold', CURRENT_DATE + INTERVAL '1 day',
    NULL,
    'Slutbesiktning av takarbeten med Daniel'
  ),
  (
    'Granska Fentrica-integration docs',
    'pagar', 'normal',
    'a1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000011',
    'Leopold', CURRENT_DATE + INTERVAL '5 days',
    NULL,
    'Gå igenom integrationsdokumentation från Hendrik'
  ),
  (
    'Beställ Eleiko-utrustning',
    'att_gora', 'hog',
    'a1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000007',
    'Leopold', CURRENT_DATE + INTERVAL '7 days',
    NULL,
    'Slutgiltig beställning av utomhusgym-utrustning'
  ),
  (
    'Uppföljning laddstolpar — SellPower',
    'vantar_pa_svar', 'normal',
    'a1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005',
    'Leopold', CURRENT_DATE - INTERVAL '3 days',
    'Erik Humlén — leveranstid laddare',
    'Väntar på besked om leveranstid för laddstolpar'
  ),
  (
    'Nätverksdesign — ritning klar?',
    'vantar_pa_svar', 'normal',
    'a1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000010',
    'Leopold', CURRENT_DATE + INTERVAL '4 days',
    'Jonas Lindberg — nätverksritning',
    'BRS Networks ska leverera nätverksritning'
  ),
  (
    'Kontakta Julia om vindkraftstatus',
    'att_gora', 'lag',
    'a1000000-0000-0000-0000-000000000009',
    'b1000000-0000-0000-0000-000000000013',
    'Leopold', CURRENT_DATE + INTERVAL '14 days',
    NULL,
    'Kolla status på vindkraftsprojektet med Energy Machines'
  ),
  (
    'Fasadritning Nore — skicka till kommun',
    'forsenad', 'kritisk',
    'a1000000-0000-0000-0000-000000000007',
    'b1000000-0000-0000-0000-000000000016',
    'Maja', CURRENT_DATE - INTERVAL '5 days',
    NULL,
    'Fasadritningar ska in till kommunen, försenat'
  ),
  (
    'Restaurangmeny — första utkast',
    'pagar', 'normal',
    'a1000000-0000-0000-0000-000000000008',
    NULL,
    'Pontus', CURRENT_DATE + INTERVAL '10 days',
    NULL,
    'Första utkast på meny för restaurangöppning'
  ),
  (
    'SmartHome-offert — jämför med Unitab',
    'att_gora', 'normal',
    'a1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000009',
    'Leopold', CURRENT_DATE + INTERVAL '3 days',
    NULL,
    'Jämför offerter från SmartHome (Lasse) och Unitab'
  ),
  (
    'Bravida el-dragning — tidplan',
    'pagar', 'hog',
    'a1000000-0000-0000-0000-000000000006',
    'b1000000-0000-0000-0000-000000000002',
    'Leopold', CURRENT_DATE + INTERVAL '6 days',
    NULL,
    'Stäm av tidplan för el-dragning med Emil på Bravida'
  ),
  (
    'Verbier — boka flyg och boende',
    'klar', 'normal',
    'a1000000-0000-0000-0000-000000000010',
    NULL,
    'Leopold', CURRENT_DATE - INTERVAL '10 days',
    NULL,
    'Flyg och boende bokat för Verbier-resa'
  );
