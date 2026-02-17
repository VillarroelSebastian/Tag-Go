import { useEffect, useState } from "react";
import "../styles/forms.css";
import "../styles/adminPro.css";
import { listTicketsByStatus } from "../services/ticketService";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [activeCount, setActiveCount] = useState(0);
  const [recentClosed, setRecentClosed] = useState([]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const active = await listTicketsByStatus({ status: "ACTIVE", limitN: 200 });
      setActiveCount(active.length);

      const closed = await listTicketsByStatus({ status: "CLOSED", limitN: 10 });
      setRecentClosed(closed);
    } catch (e) {
      console.error("Dashboard load error:", e);
      setErr(e?.message || "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const revenueRecent = recentClosed.reduce(
    (sum, t) => sum + Number(t.priceAtClose || 0),
    0
  );

  return (
    <div className="card">
      <div className="toolbar">
        <div className="toolbar-left">
          <div>
            <h2 style={{ marginBottom: 4 }}>Dashboard</h2>
            <p className="muted">Resumen operativo rápido.</p>
          </div>
        </div>

        <div className="toolbar-right">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {err && <div className="error-box" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="muted">Tickets activos</div>
          <div style={{ fontWeight: 900, fontSize: 28 }}>{activeCount}</div>
        </div>

        <div className="card">
          <div className="muted">Ingresos (últimos 10 cierres)</div>
          <div style={{ fontWeight: 900, fontSize: 28 }}>{revenueRecent}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Últimos tickets cerrados</div>

        <div className="table-wrap">
          <table className="table-pro" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Tipo</th>
                <th>Cant.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentClosed.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 900 }}>{t.token}</td>
                  <td>{t.itemType}</td>
                  <td>{t.quantity}</td>
                  <td style={{ fontWeight: 900 }}>{t.priceAtClose ?? "-"}</td>
                </tr>
              ))}

              {recentClosed.length === 0 && (
                <tr>
                  <td colSpan="4" className="muted" style={{ padding: 14 }}>
                    Aún no hay cierres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
