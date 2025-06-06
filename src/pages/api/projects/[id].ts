// src/pages/api/projects/[id].ts
import type { APIRoute } from 'astro';

// GET single project with its tasks
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Get project details
    const { results: projects } = await DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).all();
    
    if (projects.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all tasks for this project
    const { results: tasks } = await DB.prepare(`
      SELECT * FROM tasks 
      WHERE project_id = ? 
      ORDER BY created_at DESC
    `).bind(id).all();

    const project = {
      ...projects[0],
      tasks: tasks
    };
    
    return new Response(JSON.stringify(project), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update single project
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, description, color, status } = body;

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

// DELETE - Delete single project
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
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