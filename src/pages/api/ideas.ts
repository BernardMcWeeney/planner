// src/pages/api/ideas.ts
import type { APIRoute } from 'astro';

// GET all ideas (with optional project filter)
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const DB = locals.runtime.env.DB;
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');

    let query = `
      SELECT i.*, p.name as project_name, p.color as project_color 
      FROM ideas i 
      LEFT JOIN projects p ON i.project_id = p.id
    `;
    let params: string[] = [];

    if (projectId) {
      query += " WHERE i.project_id = ?";
      params.push(projectId);
    }

    query += " ORDER BY i.created_at DESC";

    const stmt = params.length > 0 
      ? DB.prepare(query).bind(...params)
      : DB.prepare(query);
      
    const { results } = await stmt.all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch ideas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new idea (quick capture)
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { content, project_id } = body;

    if (!content || content.trim() === '') {
      return new Response(JSON.stringify({ error: 'Idea content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Validate project exists if project_id is provided
    if (project_id) {
      const { results: projectExists } = await DB.prepare("SELECT id FROM projects WHERE id = ?").bind(project_id).all();
      if (projectExists.length === 0) {
        return new Response(JSON.stringify({ error: 'Project not found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const id = `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = DB.prepare(`
      INSERT INTO ideas (id, content, project_id) 
      VALUES (?, ?, ?)
    `);
    
    await stmt.bind(id, content.trim(), project_id || null).run();

    // Fetch the created idea with project info
    const { results } = await DB.prepare(`
      SELECT i.*, p.name as project_name, p.color as project_color 
      FROM ideas i 
      LEFT JOIN projects p ON i.project_id = p.id 
      WHERE i.id = ?
    `).bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create idea' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update idea
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { id, content, project_id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Idea ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if idea exists
    const { results: existing } = await DB.prepare("SELECT id FROM ideas WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Idea not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate project exists if project_id is being updated
    if (project_id) {
      const { results: projectExists } = await DB.prepare("SELECT id FROM projects WHERE id = ?").bind(project_id).all();
      if (projectExists.length === 0) {
        return new Response(JSON.stringify({ error: 'Project not found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const stmt = DB.prepare(`
      UPDATE ideas 
      SET content = COALESCE(?, content), 
          project_id = COALESCE(?, project_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    await stmt.bind(content?.trim(), project_id, id).run();

    // Fetch the updated idea with project info
    const { results } = await DB.prepare(`
      SELECT i.*, p.name as project_name, p.color as project_color 
      FROM ideas i 
      LEFT JOIN projects p ON i.project_id = p.id 
      WHERE i.id = ?
    `).bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update idea' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete idea
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Idea ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if idea exists
    const { results: existing } = await DB.prepare("SELECT id FROM ideas WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Idea not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete idea
    await DB.prepare("DELETE FROM ideas WHERE id = ?").bind(id).run();
    
    return new Response(JSON.stringify({ message: 'Idea deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete idea' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};