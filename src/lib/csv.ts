/** Resposta HTTP de download CSV (UTF-8 com BOM para Excel). */
export function csvResponse(filename: string, content: string) {
  const body = `\uFEFF${content}`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
