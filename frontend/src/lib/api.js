import axios from "axios";
const api = axios.create({ baseURL: "http://127.0.0.1:5000" });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
export default api;
