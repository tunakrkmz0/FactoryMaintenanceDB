import { useEffect, useState } from "react";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function Alerts() {
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState("");

  async function load() {
    setState("loading");
    try {
      const { data } = await api.get("/alerts");
      setList(data?.items || []);
      setState("ok");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { load(); }, []);

  async function resolve(aid) {
    setMsg("");
    try {
      await api.post(`/alerts/${aid}/resolve`);
      setMsg("✅ Uyarı çözüldü");
      load();
    } catch (err) {
      setMsg(err?.response?.data?.msg || "Uyarı çözülemedi");
    }
  }

  if (state === "loading") return <div className="min-h-screen bg-gray-900 text-white p-6">Yükleniyor…</div>;
  if (state === "error")   return <div className="min-h-screen bg-gray-900 text-red-400 p-6">Uyarılar yüklenemedi</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="p-6">
        <div className="text-2xl font-semibold mb-4">Uyarılar</div>
        {msg && <div className="mb-4 text-blue-300 text-sm">{msg}</div>}
        <div className="grid gap-3">
          {list.map(a => (
            <div key={a.AlertID} className="bg-gray-800 p-4 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="text-lg">{a.AlertType}</div>
                  <div className="text-sm text-gray-400">{a.AlertMessage || "-"}</div>
                  <div className="text-xs text-gray-500">Makine: {a.MachineID}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={"text-xs px-2 py-1 rounded " + (a.IsResolved ? "bg-green-700" : "bg-red-700")}>
                    {a.IsResolved ? "Çözüldü" : "Açık"}
                  </span>
                  {!a.IsResolved && (
                    <button className="px-3 py-2 rounded bg-white text-gray-900" onClick={()=>resolve(a.AlertID)}>
                      Çöz
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="text-gray-400">Kayıt yok.</div>}
        </div>
      </div>
    </div>
  );
}
