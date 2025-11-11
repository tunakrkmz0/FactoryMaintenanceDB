import { useEffect, useState } from "react";
import api from "../lib/api";
import Navbar from "../components/Navbar";

function isoNow() {
  // Backend ISO datetime bekliyor (UTC ISO string uygundur)
  return new Date().toISOString();
}

export default function Maintenance() {
  const [machines, setMachines] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [faults, setFaults] = useState([]);
  const [parts, setParts] = useState([]);
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    MachineID: "",
    PersonnelID: "",
    FaultID: "",
    MRDescription: "",
    StartTime: isoNow(),
    EndTime: "",
    Cost: "0",
    Parts: [], // { PartID, Quantity, UnitCost? }
  });

  useEffect(() => {
    async function loadAll() {
      setState("loading");
      try {
        const [machs, ppl, flts, prts, recs] = await Promise.all([
          api.get("/machines"),
          api.get("/personnel"),
          api.get("/faults"),
          api.get("/parts"),
          api.get("/maintenance"),
        ]);
        setMachines(machs.data?.items || []);
        setPersonnel(ppl.data?.items || []);
        setFaults(flts.data?.items || []);
        setParts(prts.data?.items || []);
        setList(recs.data?.items || []);
        setState("ok");
      } catch (err) {
        console.error("LOAD ERROR:", err?.response?.status, err?.response?.data);
        setState("error");
      }
    }
    loadAll();
  }, []);

  function addLine() {
    setForm({
      ...form,
      Parts: [...form.Parts, { PartID: "", Quantity: 1, UnitCost: "" }],
    });
  }

  function updateLine(idx, key, value) {
    const copy = [...form.Parts];
    copy[idx] = { ...copy[idx], [key]: value };
    setForm({ ...form, Parts: copy });
  }

  function removeLine(idx) {
    const copy = [...form.Parts];
    copy.splice(idx, 1);
    setForm({ ...form, Parts: copy });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const payload = {
        MachineID: form.MachineID ? parseInt(form.MachineID, 10) : null,
        PersonnelID: form.PersonnelID ? parseInt(form.PersonnelID, 10) : null,
        FaultID: form.FaultID ? parseInt(form.FaultID, 10) : null,
        MRDescription: form.MRDescription?.trim() || null,
        StartTime: form.StartTime || isoNow(),
        EndTime: form.EndTime || null,
        Cost: form.Cost || "0",
        Parts: (form.Parts || [])
          .filter(l => l.PartID && l.Quantity)
          .map(l => ({
            PartID: parseInt(l.PartID, 10),
            Quantity: parseInt(l.Quantity, 10),
            // UnitCost boş bırakılırsa backend parça birim maliyetini kullanır
            ...(l.UnitCost ? { UnitCost: l.UnitCost } : {}),
          })),
      };

      const { data } = await api.post("/maintenance", payload);
      setMsg(`✅ Bakım kaydı oluşturuldu (ID: ${data.MaintenanceID})`);
      // formu sıfırla + listeyi yenile
      setForm({
        MachineID: "",
        PersonnelID: "",
        FaultID: "",
        MRDescription: "",
        StartTime: isoNow(),
        EndTime: "",
        Cost: "0",
        Parts: [],
      });
      const recs = await api.get("/maintenance");
      setList(recs.data?.items || []);
    } catch (err) {
      console.error("CREATE MAINT ERROR:", err?.response?.status, err?.response?.data);
      const emsg =
        err?.response?.data?.msg ||
        err?.response?.data?.detail ||
        "Bakım kaydı oluşturulamadı";
      setMsg(`❌ ${emsg}`);
    }
  }

  if (state === "loading") return <div className="min-h-screen bg-gray-900 text-white p-6">Yükleniyor…</div>;
  if (state === "error")   return <div className="min-h-screen bg-gray-900 text-red-400 p-6">Veriler yüklenemedi</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="p-6">
        <div className="text-2xl font-semibold mb-4">Bakım Kayıtları</div>
        {msg && <div className="mb-4 text-blue-300 text-sm">{msg}</div>}

        {/* Bakım Oluştur */}
        <form onSubmit={onSubmit} className="bg-gray-800 p-4 rounded-2xl mb-6 grid gap-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Makine *</label>
              <select
                required
                className="w-full p-2 rounded bg-gray-700"
                value={form.MachineID}
                onChange={(e)=>setForm({...form, MachineID: e.target.value})}
              >
                <option value="">Seçiniz</option>
                {machines.map(m => <option key={m.MachineID} value={m.MachineID}>{m.MachineName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Personel *</label>
              <select
                required
                className="w-full p-2 rounded bg-gray-700"
                value={form.PersonnelID}
                onChange={(e)=>setForm({...form, PersonnelID: e.target.value})}
              >
                <option value="">Seçiniz</option>
                {personnel.map(p => <option key={p.PersonnelID} value={p.PersonnelID}>{p.FullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Arıza (opsiyonel)</label>
              <select
                className="w-full p-2 rounded bg-gray-700"
                value={form.FaultID}
                onChange={(e)=>setForm({...form, FaultID: e.target.value})}
              >
                <option value="">Seçiniz</option>
                {faults.map(f => <option key={f.FaultID} value={f.FaultID}>{f.FaultCode}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Açıklama</label>
            <input
              className="w-full p-2 rounded bg-gray-700"
              value={form.MRDescription}
              onChange={(e)=>setForm({...form, MRDescription: e.target.value})}
              placeholder="Örn: Spindle rulman değişimi"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Başlangıç Zamanı *</label>
              <input
                className="w-full p-2 rounded bg-gray-700"
                value={form.StartTime}
                onChange={(e)=>setForm({...form, StartTime: e.target.value})}
                placeholder={isoNow()}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Bitiş Zamanı</label>
              <input
                className="w-full p-2 rounded bg-gray-700"
                value={form.EndTime}
                onChange={(e)=>setForm({...form, EndTime: e.target.value})}
                placeholder="opsiyonel"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Toplam Maliyet</label>
              <input
                className="w-full p-2 rounded bg-gray-700"
                value={form.Cost}
                onChange={(e)=>setForm({...form, Cost: e.target.value})}
                placeholder="örn: 250.00"
              />
            </div>
          </div>

          {/* Parça satırları */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Kullanılan Parçalar</div>
              <button type="button" className="px-3 py-2 rounded bg-blue-500" onClick={addLine}>+ Satır</button>
            </div>

            {form.Parts.length === 0 ? (
              <div className="text-gray-400 text-sm">Parça satırı eklenmedi.</div>
            ) : (
              <div className="grid gap-3">
                {form.Parts.map((ln, idx) => (
                  <div key={idx} className="grid md:grid-cols-4 gap-3 bg-gray-700/50 p-3 rounded-xl">
                    <select
                      className="p-2 rounded bg-gray-700"
                      value={ln.PartID}
                      onChange={(e)=>updateLine(idx, "PartID", e.target.value)}
                    >
                      <option value="">Parça seç</option>
                      {parts.map(p => <option key={p.PartID} value={p.PartID}>{p.PartName}</option>)}
                    </select>
                    <input
                      className="p-2 rounded bg-gray-700"
                      placeholder="Adet"
                      type="number"
                      value={ln.Quantity}
                      onChange={(e)=>updateLine(idx, "Quantity", e.target.value)}
                    />
                    <input
                      className="p-2 rounded bg-gray-700"
                      placeholder="Birim maliyet (opsiyonel)"
                      value={ln.UnitCost ?? ""}
                      onChange={(e)=>updateLine(idx, "UnitCost", e.target.value)}
                    />
                    <button
                      type="button"
                      className="px-3 py-2 rounded bg-red-600"
                      onClick={()=>removeLine(idx)}
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button className="px-4 py-2 rounded bg-white text-gray-900">Kaydet</button>
          </div>
        </form>

        {/* Kayıt listesi (son 300) */}
        <div className="grid gap-3">
          {list.map(r => (
            <div key={r.MaintenanceID} className="bg-gray-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="text-lg">Bakım #{r.MaintenanceID}</div>
                <div className="text-sm text-gray-400">{r.StartTime?.slice(0,16)}{r.EndTime ? (" → " + r.EndTime?.slice(0,16)) : ""}</div>
              </div>
              <div className="text-sm text-gray-400">
                Makine: {r.MachineID} • Personel: {r.PersonnelID} • Arıza: {r.FaultID || "-"}
              </div>
              <div className="text-sm mt-1">{r.MRDescription || "-"}</div>
              <div className="text-sm text-gray-300 mt-1">Maliyet: {r.Cost ?? "0"}</div>
            </div>
          ))}
          {list.length === 0 && <div className="text-gray-400">Kayıt yok.</div>}
        </div>
      </div>
    </div>
  );
}
