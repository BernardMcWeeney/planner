// src/pages/api/tasks/[id].ts
import type { APIRoute } from 'astro';

// GET single task
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Get task with project details
    const { results } = await DB.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE t.id = ?
    `).bind(id).all();
    
    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update single task
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
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
    const { title, status, priority, due_date, project_id } = body;

    const DB = locals.runtime.env.DB;
    
    // Check if task exists
    const { results: existing } = await DB.prepare("SELECT id FROM tasks WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
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
      UPDATE tasks 
      SET title = COALESCE(?, title), 
          status = COALESCE(?, status), 
          priority = COALESCE(?, priority), 
          due_date = COALESCE(?, due_date),
          project_id = COALESCE(?, project_id)
      WHERE id = ?
    `);
    
    await stmt.bind(title, status, priority, due_date, project_id, id).run();

    // Fetch the updated task with project info
    const { results } = await DB.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE t.id = ?
    `).bind(id).all();
    
    return new Response(JSON.stringify(results[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete single task
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const DB = locals.runtime.env.DB;
    
    // Check if task exists
    const { results: existing } = await DB.prepare("SELECT id FROM tasks WHERE id = ?").bind(id).all();
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete task
    await DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
    
    return new Response(JSON.stringify({ message: 'Task deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};