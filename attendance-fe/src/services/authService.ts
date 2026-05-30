// --- services/authService.ts ---
import { fetchApi } from "../utils/api";

export const authService = {
  login: (data: any) => {
    // Body: { student_id_or_email, password }
    return fetchApi<any>("/auth/login", "POST", { data });
  },

  register: (data: any) => {
    // Body: { student_id, name, email, password }
    return fetchApi<any>("/auth/register", "POST", { data });
  },
  profile: (token: string) => {
    return fetchApi<any>("/students/me", "GET", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
