import { apiHandler } from "@/lib/api";
import { taskQuerySchema } from "@/lib/validators";
import { listTasks, tasksToCSV } from "@/lib/services/task-queries";
import { csvResponse } from "@/lib/csv";

/** Exportação CSV das tarefas (filtros idênticos à listagem). */
export const GET = apiHandler(async ({ ctx, query }) => {
  const q = query(taskQuerySchema);
  const { tasks } = await listTasks(ctx.workspace.id, { ...q, limit: 5000, offset: 0 });
  const csv = tasksToCSV(tasks);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`tarefas-mission-control-${date}.csv`, csv);
});
