import { useState } from "react";
import { login } from "../services/auth";

export default function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login({ username: u, password: p });
      window.location.href = "/";
    } catch (err) {
      setErr(err?.response?.data?.msg || err?.message || "Giriş başarısız");
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-gray-800 p-6 rounded-2xl">
        <div className="text-2xl mb-4">Giriş</div>
        <input className="w-full mb-3 p-2 rounded bg-gray-700" value={u} onChange={(e)=>setU(e.target.value)} />
        <input type="password" className="w-full mb-3 p-2 rounded bg-gray-700" value={p} onChange={(e)=>setP(e.target.value)} />
        {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
        <button className="w-full py-2 rounded bg-white text-gray-900">Giriş Yap</button>
      </form>
    </div>
  );
}
