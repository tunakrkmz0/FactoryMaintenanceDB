// src/pages/Machines.jsx
import { useEffect, useState } from "react";
import api from "../lib/api";
import Navbar from "../components/Navbar"; // <-- eklendi
import { logout } from "../services/auth";

export default function Machines() {
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    MachineName: "",
    MachineModel: "",
    MachineLocation: "",
    MachineStatus: "Aktif",
  });
  const [msg, setMsg] = useState("");

  async function fetchList(search = "") {
    setState("loading");
    try {
      const res = await api.get("/machines", { params: search ? { q: search } : {} });
      setList(res.data?.items || []);
      setState("ok");
    } catch (err) {
      console.error("MACHINES ERROR:", err?.response?.status, err?.response?.data);
      setState("error");
      setMsg(err?.response?.data?.msg || "Liste yüklenemedi");
    }
  }

  useEffect(() => { fetchList(); }, []);

  async function onAddSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const payload = {
        MachineName: form.MachineName.trim(),
        MachineModel: form.MachineModel.trim() || null,
        MachineLocation: form.MachineLocation.trim() || null,
        MachineStatus: form.MachineStatus || "Aktif",
      };
      const res = await api.post("/machines", payload);
      await fetchList(q);
      setForm({ MachineName: "", MachineModel: "", MachineLocation: "", MachineStatus: "Aktif" });
      setShowAdd(false);
      setMsg(`✅ Eklendi: ${res.data.MachineName}`);
    } catch (err) {
      setMsg(err?.response?.data?.msg || "Makine eklenemedi");
    }
  }

  function onSearch(e) {
    e.preventDefault();
    fetchList(q.trim());
  }

  if (state === "loading") return <div className="min-h-screen bg-gray-900 text-white p-6">Yükleniyor…</div>;
  if (state === "error")   return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="p-6">
        <div className="text-red-400 mb-3">{msg || "Bir hata oluştu"}</div>
        <button className="bg-gray-800 px-3 py-2 rounded" onClick={()=>fetchList(q)}>Tekrar Dene</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar /> {/* <-- artık tüm sayfalarda üst menü var */}
      <div className="p-6">
        {/* Üst bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="text-2xl font-semibold">Makineler</div>
          <div className="flex gap-2">
            <form onSubmit={onSearch} className="flex gap-2">
              <input
                className="px-3 py-2 rounded bg-gray-800 outline-none"
                placeholder="Ara: isim…"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
              />
              <button className="px-3 py-2 rounded bg-white text-gray-900">Ara</button>
            </form>
            <button className="px-3 py-2 rounded bg-blue-500" onClick={()=>setShowAdd(true)}>+ Ekle</button>
            <button className="bg-white text-gray-900 px-3 py-2 rounded" onClick={logout}>Çıkış</button>
          </div>
        </div>

        {msg && <div className="mb-3 text-sm text-blue-300">{msg}</div>}

        {/* Liste */}
        {list.length === 0 ? (
          <div className="text-gray-400">Kayıt yok.</div>
        ) : (
          <div className="grid gap-3">
            {list.map((m) => (
              <div key={m.MachineID} className="rounded-2xl p-4 bg-gray-800">
                <div className="text-lg">{m.MachineName}</div>
                <div className="text-sm text-gray-400">
                  {(m.MachineModel || "-")} • {(m.MachineLocation || "-")}
                </div>
                <div className="mt-1">
                  <span className="text-xs px-2 py-1 rounded bg-gray-700">
                    {m.MachineStatus || "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ekle Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
            <form onSubmit={onAddSubmit} className="w-full max-w-md bg-gray-800 p-6 rounded-2xl shadow">
              <div className="text-xl font-semibold mb-4">Makine Ekle</div>

              <label className="block text-sm mb-1">Makine Adı *</label>
              <input
                required
                className="w-full mb-3 p-2 rounded bg-gray-700 outline-none"
                value={form.MachineName}
                onChange={(e)=>setForm({...form, MachineName: e.target.value})}
              />

              <label className="block text-sm mb-1">Model</label>
              <input
                className="w-full mb-3 p-2 rounded bg-gray-700 outline-none"
                value={form.MachineModel}
                onChange={(e)=>setForm({...form, MachineModel: e.target.value})}
              />

              <label className="block text-sm mb-1">Lokasyon</label>
              <input
                className="w-full mb-3 p-2 rounded bg-gray-700 outline-none"
                value={form.MachineLocation}
                onChange={(e)=>setForm({...form, MachineLocation: e.target.value})}
              />

              <label className="block text-sm mb-1">Durum</label>
              <select
                className="w-full mb-4 p-2 rounded bg-gray-700 outline-none"
                value={form.MachineStatus}
                onChange={(e)=>setForm({...form, MachineStatus: e.target.value})}
              >
                <option>Aktif</option>
                <option>Bakımda</option>
                <option>Arızalı</option>
              </select>

              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2 rounded bg-gray-600" onClick={()=>setShowAdd(false)}>İptal</button>
                <button className="px-3 py-2 rounded bg-white text-gray-900">Kaydet</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
