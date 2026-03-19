import { UserService } from "../../../../services/userService";
import { buildUserContext } from "../../services/ai-context.service";
import type { AiGraphStateType } from "../state";

export async function loadContext(state: AiGraphStateType) {
  const userService = new UserService();
  const { user } = await userService.getUserById(state.userId);

  if (!user) return { answer: "Usuário não encontrado." };

  return { context: buildUserContext({ user }) };
}