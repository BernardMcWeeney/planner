// src/pages/api/resources.ts
import type { APIRoute } from 'astro';

// GET all resources for a project
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
      SELECT r.*, p.name as project_name 
      FROM resources r 
      JOIN projects p ON r.project_id = p.id 
      WHERE r.project_id = ? 
      ORDER BY r.type, r.created_at DESC
    `).bind(projectId).all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch resources' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new resource
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, url, type, description, project_id } = body;

    if (!name || !url || !project_id) {
      return new Response(JSON.stringify({ error: 'Name, URL, and project_id are required' }), {
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

    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await DB.prepare(`
      INSERT INTO resources (id, name, url, type, description, project_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, name, url, type || 'link', description, project_id).run();

    // Fetch the created resource
    const { results } = await DB.prepare(`
      SELECT r.*, p.name as project_name 
      FROM resources r 
      JOIN projects p ON r.project_id = p.id 
      WHERE r.id = ?
    `).bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create resource' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update resource
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { id, name, url, type, description } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Resource ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if resource exists
    const { results: existing } = await DB.prepare("SELECT id FROM resources WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await DB.prepare(`
      UPDATE resources 
      SET name = COALESCE(?, name), 
          url = COALESCE(?, url),
          type = COALESCE(?, type),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, url, type, description, id).run();

    // Fetch the updated resource
    const { results } = await DB.prepare(`
      SELECT r.*, p.name as project_name 
      FROM resources r 
      JOIN projects p ON r.project_id = p.id 
      WHERE r.id = ?
    `).bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update resource' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete resource
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Resource ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if resource exists
    const { results: existing } = await DB.prepare("SELECT id FROM resources WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await DB.prepare("DELETE FROM resources WHERE id = ?").bind(id).run();
    
    return new Response(JSON.stringify({ message: 'Resource deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete resource' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};