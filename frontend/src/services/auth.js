import api from "../lib/api";
export async function login({ username, password }) {
  const { data } = await api.post("/auth/login", { username, password });
  if (!data?.access_token) throw new Error("Token alınamadı");
  localStorage.setItem("token", data.access_token);
}
export function logout() { localStorage.removeItem("token"); window.location.href="/login"; }
