import { z } from "zod";
import { apiHandler, created } from "@/lib/api";
import { addProjectMember } from "@/lib/services/project-service";
import { userDTO } from "@/lib/serializers";

const bodySchema = z.object({ userId: z.string().min(1) }).strict();

export const POST = apiHandler<{ id: string }>(async ({ ctx, params, body }) => {
  const data = await body(bodySchema);
  const member = await addProjectMember(ctx, params.id, data.userId);
  return created({ member: userDTO(member.user) });
});
