import { useEffect, useMemo, useState } from "react";
import "../styles/forms.css";
import "../styles/adminPro.css";
import { computeCharge, getPricing, savePricing } from "../services/pricingService";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [hourly, setHourly] = useState({ BOLSA: 5, MOCHILA: 8, MALETA: 12 });
  const [minHours, setMinHours] = useState(1);

  // preview
  const [pType, setPType] = useState("MOCHILA");
  const [pQty, setPQty] = useState(1);
  const [pMinutes, setPMinutes] = useState(95);

  async function load() {
    setErr(""); setOk("");
    setLoading(true);
    try {
      const p = await getPricing();
      setHourly({
        BOLSA: Number(p.hourly?.BOLSA ?? 5),
        MOCHILA: Number(p.hourly?.MOCHILA ?? 8),
        MALETA: Number(p.hourly?.MALETA ?? 12),
      });
      setMinHours(Number(p.minHours ?? 1));
    } catch (e) {
      setErr(e?.message || "No se pudo cargar tarifas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onSave(e) {
    e.preventDefault();
    setErr(""); setOk("");
    setLoading(true);
    try {
      await savePricing({
        hourly,
        minHours: Number(minHours),
        rounding: "CEIL",
      });
      setOk("Tarifas guardadas ✅");
    } catch (e) {
      setErr(e?.message || "No se pudo guardar tarifas.");
    } finally {
      setLoading(false);
    }
  }

  const preview = useMemo(() => {
    return computeCharge({
      itemType: pType,
      quantity: Number(pQty),
      minutesElapsed: Number(pMinutes),
      pricing: { hourly, minHours: Number(minHours), rounding: "CEIL" },
    });
  }, [pType, pQty, pMinutes, hourly, minHours]);

  function setRate(type, value) {
    setHourly((h) => ({ ...h, [type]: Number(value) }));
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div className="toolbar-left">
          <div>
            <h2 style={{ marginBottom: 4 }}>Tarifas</h2>
            <div className="muted">Configura precios por hora y horas mínimas a cobrar.</div>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "..." : "Actualizar"}
          </button>
        </div>
      </div>

      {ok && <div className="card" style={{ padding: 12, borderColor: "rgba(34,197,94,0.25)", marginBottom: 10 }}>{ok}</div>}
      {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

      <form onSubmit={onSave} className="form">
        <div className="grid-2">
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Precios por hora</div>

            <div className="row-2">
              <div className="field">
                <label>Bolsa</label>
                <input type="number" min="0" value={hourly.BOLSA} onChange={(e) => setRate("BOLSA", e.target.value)} />
              </div>

              <div className="field">
                <label>Mochila</label>
                <input type="number" min="0" value={hourly.MOCHILA} onChange={(e) => setRate("MOCHILA", e.target.value)} />
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>Maleta</label>
              <input type="number" min="0" value={hourly.MALETA} onChange={(e) => setRate("MALETA", e.target.value)} />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>Horas mínimas a cobrar</label>
              <input type="number" min="1" value={minHours} onChange={(e) => setMinHours(e.target.value)} />
              <div className="muted" style={{ marginTop: 6 }}>
                Se redondea hacia arriba (ej: 1h 05m = 2 horas).
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={loading}>
              {loading ? "Guardando..." : "Guardar tarifas"}
            </button>
          </div>

          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Vista previa de cobro</div>

            <div className="row-2">
              <div className="field">
                <label>Tipo</label>
                <select value={pType} onChange={(e) => setPType(e.target.value)}>
                  <option value="BOLSA">Bolsa</option>
                  <option value="MOCHILA">Mochila</option>
                  <option value="MALETA">Maleta</option>
                </select>
              </div>
              <div className="field">
                <label>Cantidad</label>
                <input type="number" min="1" value={pQty} onChange={(e) => setPQty(e.target.value)} />
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>Minutos transcurridos</label>
              <input type="number" min="0" value={pMinutes} onChange={(e) => setPMinutes(e.target.value)} />
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="kv">
                <div className="k">Tarifa/hora</div>
                <div className="v">{preview.rate}</div>

                <div className="k">Horas cobradas</div>
                <div className="v">{preview.hoursBilled}</div>

                <div className="k">Total</div>
                <div className="v" style={{ fontSize: 20 }}>{preview.total}</div>
              </div>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Esto es exactamente lo que verá el operador en Check-out.
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
