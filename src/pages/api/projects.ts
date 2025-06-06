// src/pages/api/projects.ts
import type { APIRoute } from 'astro';

// GET all projects
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const DB = locals.runtime.env.DB;
    const { results } = await DB.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new project
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, description, color, status } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Project name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = DB.prepare(`
      INSERT INTO projects (id, name, description, color, status) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      id,
      name,
      description || null,
      color || '#6366f1',
      status || 'active'
    ).run();

    // Fetch the created project
    const { results } = await DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update project
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { id, name, description, color, status } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if project exists
    const { results: existing } = await DB.prepare("SELECT id FROM projects WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stmt = DB.prepare(`
      UPDATE projects 
      SET name = COALESCE(?, name), 
          description = COALESCE(?, description), 
          color = COALESCE(?, color), 
          status = COALESCE(?, status)
      WHERE id = ?
    `);
    
    await stmt.bind(name, description, color, status, id).run();

    // Fetch the updated project
    const { results } = await DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete project
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if project exists
    const { results: existing } = await DB.prepare("SELECT id FROM projects WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete project (tasks will be deleted automatically due to CASCADE)
    await DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    
    return new Response(JSON.stringify({ message: 'Project deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};