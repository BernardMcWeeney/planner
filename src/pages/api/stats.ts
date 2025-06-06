// src/pages/api/stats.ts
import type { APIRoute } from 'astro';

// GET dashboard statistics
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const DB = locals.runtime.env.DB;
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');

    // Base queries - if project_id is provided, filter by project
    const projectFilter = projectId ? 'WHERE project_id = ?' : '';
    const projectJoin = projectId ? 'WHERE p.id = ?' : '';

    // Get project statistics
    const projectStatsQuery = projectId 
      ? 'SELECT COUNT(*) as total_projects FROM projects WHERE id = ?'
      : 'SELECT COUNT(*) as total_projects FROM projects';
    
    const { results: projectStats } = projectId 
      ? await DB.prepare(projectStatsQuery).bind(projectId).all()
      : await DB.prepare(projectStatsQuery).all();

    // Get task statistics
    const taskStatsQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tasks,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_tasks,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_tasks,
        COUNT(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND status != 'done' THEN 1 END) as overdue_tasks
      FROM tasks 
      ${projectFilter}
    `;

    const { results: taskStats } = projectId 
      ? await DB.prepare(taskStatsQuery).bind(projectId).all()
      : await DB.prepare(taskStatsQuery).all();

    // Get ideas count
    const ideasQuery = `SELECT COUNT(*) as total_ideas FROM ideas ${projectFilter}`;
    const { results: ideaStats } = projectId 
      ? await DB.prepare(ideasQuery).bind(projectId).all()
      : await DB.prepare(ideasQuery).all();

    // Get notes count
    const notesQuery = `SELECT COUNT(*) as total_notes FROM notes ${projectFilter}`;
    const { results: noteStats } = projectId 
      ? await DB.prepare(notesQuery).bind(projectId).all()
      : await DB.prepare(notesQuery).all();

    // Get resources count
    const resourcesQuery = `SELECT COUNT(*) as total_resources FROM resources ${projectFilter}`;
    const { results: resourceStats } = projectId 
      ? await DB.prepare(resourcesQuery).bind(projectId).all()
      : await DB.prepare(resourcesQuery).all();

    // Get recent activity (last 7 days)
    const recentActivityQuery = projectId ? `
      SELECT 
        COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as tasks_this_week,
        COUNT(CASE WHEN updated_at >= date('now', '-7 days') AND created_at < date('now', '-7 days') THEN 1 END) as tasks_updated_this_week
      FROM tasks 
      WHERE project_id = ?
    ` : `
      SELECT 
        COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as tasks_this_week,
        COUNT(CASE WHEN updated_at >= date('now', '-7 days') AND created_at < date('now', '-7 days') THEN 1 END) as tasks_updated_this_week
      FROM tasks
    `;

    const { results: activityStats } = projectId 
      ? await DB.prepare(recentActivityQuery).bind(projectId).all()
      : await DB.prepare(recentActivityQuery).all();

    // Get project status breakdown (only for global stats)
    let projectStatusStats = [];
    if (!projectId) {
      const { results } = await DB.prepare(`
        SELECT 
          status,
          COUNT(*) as count
        FROM projects 
        GROUP BY status
      `).all();
      projectStatusStats = results;
    }

    // Calculate completion rate
    const totalTasks = taskStats[0].total_tasks || 0;
    const completedTasks = taskStats[0].completed_tasks || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate productivity score (simple algorithm)
    const todoTasks = taskStats[0].todo_tasks || 0;
    const inProgressTasks = taskStats[0].in_progress_tasks || 0;
    const overdueTasks = taskStats[0].overdue_tasks || 0;
    
    // Productivity score: completed tasks boost, overdue tasks reduce, in-progress tasks are neutral
    let productivityScore = 0;
    if (totalTasks > 0) {
      productivityScore = Math.max(0, Math.min(100, 
        (completedTasks * 2 - overdueTasks * 3 + inProgressTasks * 0.5) / totalTasks * 50
      ));
    }

    // Compile stats
    const stats = {
      overview: {
        total_projects: projectStats[0].total_projects,
        total_tasks: totalTasks,
        total_ideas: ideaStats[0].total_ideas,
        total_notes: noteStats[0].total_notes,
        total_resources: resourceStats[0].total_resources,
        completion_rate: completionRate,
        productivity_score: Math.round(productivityScore)
      },
      tasks: {
        todo: todoTasks,
        in_progress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        by_priority: {
          high: taskStats[0].high_priority_tasks,
          medium: taskStats[0].medium_priority_tasks,
          low: taskStats[0].low_priority_tasks
        }
      },
      activity: {
        tasks_created_this_week: activityStats[0].tasks_this_week,
        tasks_updated_this_week: activityStats[0].tasks_updated_this_week
      },
      projects: projectStatusStats
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch statistics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};