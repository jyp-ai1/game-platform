"use server";

import {
  generateAssistantContent,
  type AssistantTask,
} from "@/lib/ops/assistant-generate";
import { buildOpsContext } from "@/lib/ops/assistant-context";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function runAssistantTask(task: AssistantTask) {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }

  const ctx = await buildOpsContext();
  return generateAssistantContent(task, ctx);
}
