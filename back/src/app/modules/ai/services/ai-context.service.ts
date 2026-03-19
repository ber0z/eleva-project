import type { User} from "@prisma/client";

type BuildUserContextInput = {
  user: Pick<User, "id" | "name" | "gender" | "birthDate" | "lastAccess">;
};

export function buildUserContext({ user }: BuildUserContextInput) {
  const now = new Date();
  const age = user.birthDate
    ? Math.floor((now.getTime() - new Date(user.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return {
    currentDate: now.toISOString().slice(0, 10), // YYYY-MM-DD — use esta data como "hoje" ao interpretar expressões como "ontem", "semana passada", etc.
    profile: {
      name: user.name,
      gender: user.gender,
      birthDate: user.birthDate,
      age,
    },
  };
}
