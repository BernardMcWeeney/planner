-- Updated schema.sql for expanded project management

-- Drop existing tables
DROP TABLE IF EXISTS ideas;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;

-- Enhanced Projects table
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT, -- Alternative display title
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    theme TEXT DEFAULT 'default', -- UI theme for project
    image TEXT, -- Project image/avatar URL
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived', 'paused'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (same as before but with updated_at)
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo', -- 'todo', 'in_progress', 'done'
    priority TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
    due_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Ideas table for quick capture
CREATE TABLE ideas (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT, -- Optional association with project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Notes table for project documentation
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Resources table for project links, files, etc.
CREATE TABLE resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'link', -- 'link', 'file', 'document', 'tool'
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Seed data with enhanced projects
INSERT INTO projects (id, name, title, description, color, theme, status) VALUES 
('proj_1', 'Personal Website', 'Portfolio & Blog', 'Building my portfolio and blog with Next.js', '#3b82f6', 'blue', 'active'),
('proj_2', 'Smart Home Setup', 'Home Automation', 'Home automation with Raspberry Pi and sensors', '#10b981', 'green', 'active'),
('proj_3', 'SaaS Idea', 'Task Management App', 'Building a simple task management SaaS', '#f59e0b', 'yellow', 'active');

INSERT INTO tasks (id, title, status, priority, project_id, due_date) VALUES 
('task_1', 'Design homepage layout', 'todo', 'high', 'proj_1', '2025-07-15'),
('task_2', 'Set up hosting', 'todo', 'medium', 'proj_1', '2025-07-20'),
('task_3', 'Install sensors', 'in_progress', 'medium', 'proj_2', '2025-07-18'),
('task_4', 'Research competitors', 'todo', 'high', 'proj_3', '2025-07-10'),
('task_5', 'Create MVP wireframes', 'done', 'medium', 'proj_3', '2025-06-30');

INSERT INTO ideas (id, content, project_id) VALUES 
('idea_1', 'Add dark mode toggle to website header', 'proj_1'),
('idea_2', 'Voice control for lights using Alexa integration', 'proj_2'),
('idea_3', 'Freemium pricing model - 5 projects free, unlimited paid', 'proj_3'),
('idea_4', 'Mobile app for quick task capture on the go', NULL),
('idea_5', 'Integration with Notion for project documentation', NULL);

INSERT INTO notes (id, title, content, project_id) VALUES 
('note_1', 'Tech Stack Decision', 'Going with Next.js 14, Tailwind CSS, and Vercel for deployment. Fast, modern, and great developer experience.', 'proj_1'),
('note_2', 'Sensor Placement Strategy', 'Motion sensors in living room and kitchen. Temperature sensors in bedrooms. Door sensors on main entry points.', 'proj_2'),
('note_3', 'User Research Findings', 'Most users want simple, clean interface. Integration with existing tools is crucial. Mobile-first approach needed.', 'proj_3');

INSERT INTO resources (id, name, url, type, description, project_id) VALUES 
('res_1', 'Next.js Documentation', 'https://nextjs.org/docs', 'document', 'Official Next.js documentation for reference', 'proj_1'),
('res_2', 'Figma Design System', 'https://figma.com/file/abc123', 'tool', 'Design system and components for the website', 'proj_1'),
('res_3', 'Raspberry Pi Setup Guide', 'https://raspberrypi.org/documentation', 'document', 'Official setup and configuration guide', 'proj_2'),
('res_4', 'Competitor Analysis Sheet', 'https://docs.google.com/spreadsheets/abc', 'document', 'Detailed analysis of existing task management tools', 'proj_3'),
('res_5', 'User Interview Notes', 'https://notion.so/interviews', 'document', 'Notes from user interviews and feedback sessions', 'proj_3');