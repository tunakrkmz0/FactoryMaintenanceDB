import { useEffect, useState } from "react";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function Faults() {
  const [machines, setMachines] = useState([]);
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    FaultCode: "",
    FaultDescription: "",
    Severity: "Orta",
    MachineID: "",
  });

  async function load() {
    setState("loading");
    try {
      const [machs, faults] = await Promise.all([
        api.get("/machines"),
        api.get("/faults"),
      ]);
      setMachines(machs.data?.items || machs.data || []); // GET /machines bazen items veya düz liste olabilir
      setList(faults.data?.items || []);
      setState("ok");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const payload = {
        FaultCode: form.FaultCode.trim(),
        FaultDescription: form.FaultDescription.trim() || null,
        Severity: form.Severity,
        MachineID: form.MachineID ? parseInt(form.MachineID, 10) : null,
      };
      await api.post("/faults", payload);
      setForm({ FaultCode: "", FaultDescription: "", Severity: "Orta", MachineID: "" });
      setMsg("✅ Arıza kaydı oluşturuldu");
      load();
    } catch (err) {
      setMsg(err?.response?.data?.msg || "Arıza kaydı oluşturulamadı");
    }
  }

  if (state === "loading") return <div className="min-h-screen bg-gray-900 text-white p-6">Yükleniyor…</div>;
  if (state === "error")   return <div className="min-h-screen bg-gray-900 text-red-400 p-6">Veriler yüklenemedi</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="p-6">
        <div className="text-2xl font-semibold mb-4">Arızalar</div>

        {msg && <div className="mb-4 text-blue-300 text-sm">{msg}</div>}

        {/* Arıza Ekle */}
        <form onSubmit={onSubmit} className="bg-gray-800 p-4 rounded-2xl mb-6 grid md:grid-cols-5 gap-3">
          <input className="p-2 rounded bg-gray-700" placeholder="Kod *"
                 value={form.FaultCode} onChange={(e)=>setForm({...form, FaultCode:e.target.value})} required/>
          <input className="p-2 rounded bg-gray-700" placeholder="Açıklama"
                 value={form.FaultDescription} onChange={(e)=>setForm({...form, FaultDescription:e.target.value})}/>
          <select className="p-2 rounded bg-gray-700"
                  value={form.Severity} onChange={(e)=>setForm({...form, Severity:e.target.value})}>
            <option>Düşük</option>
            <option>Orta</option>
            <option>Yüksek</option>
          </select>
          <select className="p-2 rounded bg-gray-700"
                  value={form.MachineID} onChange={(e)=>setForm({...form, MachineID:e.target.value})}>
            <option value="">Makine (opsiyonel)</option>
            {machines.map(m => <option key={m.MachineID} value={m.MachineID}>{m.MachineName}</option>)}
          </select>
          <button className="px-3 py-2 rounded bg-white text-gray-900">Kaydet</button>
        </form>

        {/* Liste */}
        <div className="grid gap-3">
          {list.map(f => (
            <div key={f.FaultID} className="bg-gray-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg">{f.FaultCode} <span className="text-sm text-gray-400">({f.Severity})</span></div>
                  <div className="text-sm text-gray-400">{f.FaultDescription || "-"}</div>
                </div>
                <div className="text-sm text-gray-400">Makine: {f.MachineID || "-"}</div>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="text-gray-400">Kayıt yok.</div>}
        </div>
      </div>
    </div>
  );
}
