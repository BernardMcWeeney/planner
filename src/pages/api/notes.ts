// src/pages/api/notes.ts
import type { APIRoute } from 'astro';

// GET all notes for a project
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const DB = locals.runtime.env.DB;
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { results } = await DB.prepare(`
      SELECT n.*, p.name as project_name 
      FROM notes n 
      JOIN projects p ON n.project_id = p.id 
      WHERE n.project_id = ? 
      ORDER BY n.updated_at DESC
    `).bind(projectId).all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch notes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new note
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { title, content, project_id } = body;

    if (!title || !content || !project_id) {
      return new Response(JSON.stringify({ error: 'Title, content, and project_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Validate project exists
    const { results: projectExists } = await DB.prepare("SELECT id FROM projects WHERE id = ?").bind(project_id).all();
    if (projectExists.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await DB.prepare(`
      INSERT INTO notes (id, title, content, project_id) 
      VALUES (?, ?, ?, ?)
    `).bind(id, title, content, project_id).run();

    // Fetch the created note
    const { results } = await DB.prepare(`
      SELECT n.*, p.name as project_name 
      FROM notes n 
      JOIN projects p ON n.project_id = p.id 
      WHERE n.id = ?
    `).bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create note' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update note
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { id, title, content } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Note ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if note exists
    const { results: existing } = await DB.prepare("SELECT id FROM notes WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await DB.prepare(`
      UPDATE notes 
      SET title = COALESCE(?, title), 
          content = COALESCE(?, content),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(title, content, id).run();

    // Fetch the updated note
    const { results } = await DB.prepare(`
      SELECT n.*, p.name as project_name 
      FROM notes n 
      JOIN projects p ON n.project_id = p.id 
      WHERE n.id = ?
    `).bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update note' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete note
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Note ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if note exists
    const { results: existing } = await DB.prepare("SELECT id FROM notes WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
    
    return new Response(JSON.stringify({ message: 'Note deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete note' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};