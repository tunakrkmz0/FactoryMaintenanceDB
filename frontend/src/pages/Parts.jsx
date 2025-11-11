import { useEffect, useState } from "react";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function Parts() {
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ PartName: "", PartNumber: "", UnitCost: "", UnitsInStock: "" });
  const [adj, setAdj] = useState({}); // { [PartID]: amount }

  async function load() {
    setState("loading");
    try {
      const { data } = await api.get("/parts");
      setList(data?.items || []);
      setState("ok");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { load(); }, []);

  async function addPart(e) {
    e.preventDefault();
    setMsg("");
    try {
      const payload = {
        PartName: form.PartName.trim(),
        PartNumber: form.PartNumber.trim() || null,
        UnitCost: form.UnitCost || "0",
        UnitsInStock: parseInt(form.UnitsInStock || "0", 10),
      };
      await api.post("/parts", payload);
      setForm({ PartName: "", PartNumber: "", UnitCost: "", UnitsInStock: "" });
      setMsg("✅ Parça eklendi");
      load();
    } catch (err) {
      setMsg(err?.response?.data?.msg || "Parça eklenemedi");
    }
  }

  async function adjust(pid, amount) {
    setMsg("");
    try {
      await api.post(`/parts/${pid}/adjust`, { amount: parseInt(amount, 10) || 0 });
      setAdj({ ...adj, [pid]: "" });
      setMsg("✅ Stok güncellendi");
      load();
    } catch (err) {
      setMsg(err?.response?.data?.msg || "Stok güncellenemedi");
    }
  }

  if (state === "loading") return <div className="min-h-screen bg-gray-900 text-white p-6">Yükleniyor…</div>;
  if (state === "error")   return <div className="min-h-screen bg-gray-900 text-red-400 p-6">Parçalar yüklenemedi</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="p-6">
        <div className="text-2xl font-semibold mb-4">Parçalar</div>

        {msg && <div className="mb-4 text-blue-300 text-sm">{msg}</div>}

        {/* Parça Ekle */}
        <form onSubmit={addPart} className="bg-gray-800 p-4 rounded-2xl mb-6 grid md:grid-cols-5 gap-3">
          <input className="p-2 rounded bg-gray-700" placeholder="Parça adı *"
                 value={form.PartName} onChange={(e)=>setForm({...form, PartName:e.target.value})} required/>
          <input className="p-2 rounded bg-gray-700" placeholder="Parça no"
                 value={form.PartNumber} onChange={(e)=>setForm({...form, PartNumber:e.target.value})}/>
          <input className="p-2 rounded bg-gray-700" placeholder="Birim maliyet (ör. 120.00)"
                 value={form.UnitCost} onChange={(e)=>setForm({...form, UnitCost:e.target.value})}/>
          <input className="p-2 rounded bg-gray-700" placeholder="Stok adedi"
                 value={form.UnitsInStock} onChange={(e)=>setForm({...form, UnitsInStock:e.target.value})}/>
          <button className="px-3 py-2 rounded bg-white text-gray-900">Ekle</button>
        </form>

        {/* Liste */}
        <div className="grid gap-3">
          {list.map(p => (
            <div key={p.PartID} className="bg-gray-800 p-4 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="text-lg">{p.PartName}</div>
                  <div className="text-sm text-gray-400">
                    {p.PartNumber || "-"} • Birim: {p.UnitCost} • Stok: {p.UnitsInStock}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input className="p-2 rounded bg-gray-700 w-32"
                         placeholder="+/- adet"
                         value={adj[p.PartID] ?? ""}
                         onChange={(e)=>setAdj({ ...adj, [p.PartID]: e.target.value })}/>
                  <button className="px-3 py-2 rounded bg-white text-gray-900"
                          onClick={()=>adjust(p.PartID, adj[p.PartID])}>
                    Güncelle
                  </button>
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
