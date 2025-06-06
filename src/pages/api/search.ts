// src/pages/api/search.ts - Global search across all content
export const SEARCH_API: APIRoute = async ({ request, locals }) => {
  try {
    const DB = locals.runtime.env.DB;
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const projectId = url.searchParams.get('project_id');

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Search query must be at least 2 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const projectFilter = projectId ? 'AND t.project_id = ?' : '';
    
    // Search across tasks, ideas, notes, and resources
    const searches = await Promise.all([
      // Tasks
      DB.prepare(`
        SELECT 'task' as type, t.id, t.title as name, t.title as content, t.project_id, p.name as project_name 
        FROM tasks t 
        LEFT JOIN projects p ON t.project_id = p.id 
        WHERE t.title LIKE ? ${projectFilter}
      `).bind(searchTerm, ...(projectId ? [projectId] : [])).all(),

      // Ideas
      DB.prepare(`
        SELECT 'idea' as type, i.id, 'Idea' as name, i.content, i.project_id, p.name as project_name 
        FROM ideas i 
        LEFT JOIN projects p ON i.project_id = p.id 
        WHERE i.content LIKE ? ${projectFilter.replace('t.', 'i.')}
      `).bind(searchTerm, ...(projectId ? [projectId] : [])).all(),

      // Notes
      DB.prepare(`
        SELECT 'note' as type, n.id, n.title as name, n.content, n.project_id, p.name as project_name 
        FROM notes n 
        LEFT JOIN projects p ON n.project_id = p.id 
        WHERE (n.title LIKE ? OR n.content LIKE ?) ${projectFilter.replace('t.', 'n.')}
      `).bind(searchTerm, searchTerm, ...(projectId ? [projectId] : [])).all(),

      // Resources
      DB.prepare(`
        SELECT 'resource' as type, r.id, r.name, r.description as content, r.project_id, p.name as project_name 
        FROM resources r 
        LEFT JOIN projects p ON r.project_id = p.id 
        WHERE (r.name LIKE ? OR r.description LIKE ?) ${projectFilter.replace('t.', 'r.')}
      `).bind(searchTerm, searchTerm, ...(projectId ? [projectId] : [])).all(),

      // Projects (if not filtering by specific project)
      !projectId ? DB.prepare(`
        SELECT 'project' as type, id, name, description as content, id as project_id, name as project_name 
        FROM projects 
        WHERE (name LIKE ? OR description LIKE ?)
      `).bind(searchTerm, searchTerm).all() : Promise.resolve({ results: [] })
    ]);

    // Combine and sort results
    const allResults = searches.flatMap(search => search.results || []);
    
    return new Response(JSON.stringify({
      query: query.trim(),
      total: allResults.length,
      results: allResults
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
