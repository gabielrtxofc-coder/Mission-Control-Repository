import { apiHandler, ok, created } from "@/lib/api";
import { tagCreateSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { tagDTO } from "@/lib/serializers";

export const GET = apiHandler(async ({ ctx }) => {
  const tags = await db.tag.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { name: "asc" },
  });
  return ok({ tags: tags.map(tagDTO) });
});

export const POST = apiHandler(async ({ ctx, body }) => {
  const data = await body(tagCreateSchema);
  const existing = await db.tag.findUnique({
    where: { workspaceId_name: { workspaceId: ctx.workspace.id, name: data.name } },
  });
  if (existing) throw conflict("Já existe uma etiqueta com este nome.");

  const tag = await db.tag.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: data.name,
      color: data.color,
    },
  });
  return created({ tag: tagDTO(tag) });
});
