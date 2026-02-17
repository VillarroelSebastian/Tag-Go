import { useEffect, useMemo, useState } from "react";
import "../styles/adminPro.css";
import { listTicketsByStatus } from "../services/ticketService";
import { listBranches } from "../services/branchService";
import { useNavigate } from "react-router-dom";

function fmtTS(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}

export default function Tickets() {
  const nav = useNavigate();

  const [tab, setTab] = useState("ACTIVE"); // ACTIVE | CLOSED
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [tickets, setTickets] = useState([]);

  // branches map: id -> name
  const [branchMap, setBranchMap] = useState({});

  // modal details
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  async function loadBranches() {
    try {
      const data = await listBranches();
      const m = {};
      data.forEach((b) => (m[b.id] = b.name || b.id));
      setBranchMap(m);
    } catch {
      // si falla, igual seguimos con IDs
      setBranchMap({});
    }
  }

  async function loadTickets() {
    setErr("");
    setLoading(true);
    try {
      const data = await listTicketsByStatus({ status: tab, limitN: 150 });
      setTickets(data);
    } catch (e) {
      console.error("Tickets load error:", e);
      setErr(e?.message || "No se pudo cargar tickets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [tab]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tickets;
    return tickets.filter((t) => {
      const branchName = (branchMap[t.branchId] || t.branchId || "").toLowerCase();
      return (
        (t.token || "").toLowerCase().includes(s) ||
        branchName.includes(s) ||
        (t.itemType || "").toLowerCase().includes(s)
      );
    });
  }, [q, tickets, branchMap]);

  function openDetails(t) {
    setSelected(t);
    setOpen(true);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  function branchLabel(branchId) {
    return branchMap[branchId] || branchId || "-";
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div className="toolbar-left">
          <div>
            <h2 style={{ marginBottom: 4 }}>Tickets</h2>
            <div className="muted">Activos y entregados. Busca, revisa detalles y opera rápido.</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={`btn ${tab === "ACTIVE" ? "btn-primary" : ""}`}
              onClick={() => setTab("ACTIVE")}
            >
              Activos
            </button>
            <button
              className={`btn ${tab === "CLOSED" ? "btn-primary" : ""}`}
              onClick={() => setTab("CLOSED")}
            >
              Entregados
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por token, sucursal o tipo..."
          />
          <button className="btn" onClick={loadTickets} disabled={loading}>
            {loading ? "..." : "Actualizar"}
          </button>
        </div>
      </div>

      {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

      <div className="table-wrap">
        <table className="table-pro">
          <thead>
            <tr>
              <th>Token</th>
              <th>Sucursal</th>
              <th>Tipo</th>
              <th>Cant.</th>
              <th>Entrada</th>
              {tab === "CLOSED" && <th>Salida</th>}
              <th>Estado</th>
              <th style={{ width: 310 }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 900, letterSpacing: 0.5 }}>{t.token}</td>
                <td>{branchLabel(t.branchId)}</td>
                <td>{t.itemType}</td>
                <td>{t.quantity}</td>
                <td>{fmtTS(t.createdAt)}</td>

                {tab === "CLOSED" && <td>{fmtTS(t.closedAt)}</td>}

                <td>
                  {t.status === "ACTIVE"
                    ? <span className="chip blue">Activo</span>
                    : <span className="chip green">Entregado</span>}
                </td>

                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => openDetails(t)}>
                      Detalles
                    </button>

                    <button className="btn" onClick={() => copy(t.token)}>
                      Copiar token
                    </button>

                    {t.status === "ACTIVE" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => nav(`/app/checkout?token=${encodeURIComponent(t.token)}`)}
                      >
                        Ir a Check-out
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={tab === "CLOSED" ? 8 : 7} className="muted" style={{ padding: 14 }}>
                  No hay resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALLES */}
      {open && selected && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Detalle del ticket</div>
              <button className="btn" onClick={() => setOpen(false)}>Cerrar</button>
            </div>

            <div className="modal-body">
              <div className="card">
                <div className="kv">
                  <div className="k">Token</div>
                  <div className="v">{selected.token}</div>

                  <div className="k">Sucursal</div>
                  <div className="v">{branchLabel(selected.branchId)}</div>

                  <div className="k">Tipo</div>
                  <div className="v">{selected.itemType}</div>

                  <div className="k">Cantidad</div>
                  <div className="v">{selected.quantity}</div>

                  <div className="k">Estado</div>
                  <div className="v">
                    {selected.status === "ACTIVE"
                      ? <span className="chip blue">Activo</span>
                      : <span className="chip green">Entregado</span>}
                  </div>

                  <div className="k">Entrada</div>
                  <div className="v">{fmtTS(selected.createdAt)}</div>

                  <div className="k">Nota</div>
                  <div className="v">{selected.notes || "-"}</div>

                  {selected.status === "CLOSED" && (
                    <>
                      <div className="k">Salida</div>
                      <div className="v">{fmtTS(selected.closedAt)}</div>

                      <div className="k">Horas cobradas</div>
                      <div className="v">{selected.hoursBilled ?? "-"}</div>

                      <div className="k">Total cobrado</div>
                      <div className="v" style={{ fontSize: 18 }}>{selected.priceAtClose ?? "-"}</div>

                      <div className="k">Pagado</div>
                      <div className="v">{selected.paid ? "Sí" : "No"}</div>
                    </>
                  )}
                </div>
              </div>

              <div className="row-actions">
                <button className="btn" onClick={() => copy(selected.token)}>Copiar token</button>

                {selected.status === "ACTIVE" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setOpen(false);
                      nav(`/app/checkout?token=${encodeURIComponent(selected.token)}`);
                    }}
                  >
                    Abrir Check-out con token
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
