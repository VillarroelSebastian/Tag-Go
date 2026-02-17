import { useEffect, useState } from "react";
import "../styles/forms.css";
import "../styles/adminPro.css";

import { auth } from "../config/firebase";
import { getTicketByToken, closeTicket } from "../services/ticketService";
import { getPricing, computeCharge } from "../services/pricingService";
import { useSearchParams } from "react-router-dom";

function minutesBetween(createdAt) {
  if (!createdAt) return 0;
  const start = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / 60000));
}

export default function CheckOut() {
  const [sp] = useSearchParams();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [ticket, setTicket] = useState(null);
  const [calc, setCalc] = useState(null);

  async function findByToken(rawToken) {
    setErr("");
    setTicket(null);
    setCalc(null);

    const clean = (rawToken || "").trim().toUpperCase();
    if (clean.length < 4) {
      setErr("Token inválido.");
      return;
    }

    setLoading(true);
    try {
      const t = await getTicketByToken(clean);
      if (!t) {
        setErr("No existe un ticket con ese token.");
        return;
      }

      const pricing = await getPricing();
      const mins = minutesBetween(t.createdAt);

      const c = computeCharge({
        itemType: t.itemType,
        quantity: t.quantity,
        minutesElapsed: mins,
        pricing,
      });

      setTicket(t);
      setCalc({ ...c, minutesElapsed: mins });
    } catch (e) {
      console.error("Checkout find error:", e);
      setErr(e?.message || "Error buscando ticket.");
    } finally {
      setLoading(false);
    }
  }

  // Si viene token por query param, autocompletar y buscar
  useEffect(() => {
    const qpToken = sp.get("token");
    if (qpToken) {
      setToken(qpToken);
      // auto-buscar una vez
      findByToken(qpToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFind(e) {
    e.preventDefault();
    await findByToken(token);
  }

  async function onClose() {
    if (!ticket || !calc) return;
    setErr("");
    setLoading(true);
    try {
      if (ticket.status === "CLOSED") {
        setErr("Este ticket ya fue cerrado.");
        return;
      }

      await closeTicket({
        ticketId: ticket.id,
        priceAtClose: calc.total,
        hoursBilled: calc.hoursBilled,
        paid: true,
        closedBy: auth.currentUser?.uid ?? null,
      });

      setTicket({
        ...ticket,
        status: "CLOSED",
        paid: true,
        priceAtClose: calc.total,
        hoursBilled: calc.hoursBilled,
      });
    } catch (e) {
      console.error("Checkout close error:", e);
      setErr(e?.message || "No se pudo cerrar el ticket.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div className="toolbar-left">
          <div>
            <h2 style={{ marginBottom: 4 }}>Check-out (Entrega)</h2>
            <p className="muted">Busca por token y cierra el resguardo (cobro + entrega).</p>
          </div>
        </div>
      </div>

      <form onSubmit={onFind} className="form" style={{ marginTop: 12 }}>
        <div className="row-2">
          <div className="field">
            <label>Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Ej: AB12CD34"
            />
          </div>

          <div className="field">
            <label>&nbsp;</label>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {err && <div className="error-box">{err}</div>}
      </form>

      {ticket && calc && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="muted">TOKEN</div>
              <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>{ticket.token}</div>
            </div>

            <div>
              <div className="muted">ESTADO</div>
              {ticket.status === "ACTIVE" ? (
                <span className="chip blue">Activo</span>
              ) : (
                <span className="chip green">Entregado</span>
              )}
            </div>
          </div>

          <div className="row-2" style={{ marginTop: 12 }}>
            <div>
              <div className="muted">Tipo</div>
              <div style={{ fontWeight: 900 }}>{ticket.itemType}</div>
            </div>
            <div>
              <div className="muted">Cantidad</div>
              <div style={{ fontWeight: 900 }}>{ticket.quantity}</div>
            </div>
          </div>

          <div className="row-2" style={{ marginTop: 12 }}>
            <div>
              <div className="muted">Minutos transcurridos</div>
              <div style={{ fontWeight: 900 }}>{calc.minutesElapsed}</div>
            </div>
            <div>
              <div className="muted">Horas cobradas</div>
              <div style={{ fontWeight: 900 }}>{calc.hoursBilled}</div>
            </div>
          </div>

          <div className="row-2" style={{ marginTop: 12 }}>
            <div>
              <div className="muted">Tarifa/hora</div>
              <div style={{ fontWeight: 900 }}>{calc.rate}</div>
            </div>
            <div>
              <div className="muted">TOTAL</div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>{calc.total}</div>
            </div>
          </div>

          <div className="row-actions" style={{ marginTop: 12 }}>
            <button
              className={`btn ${ticket.status === "CLOSED" ? "" : "btn-primary"}`}
              onClick={onClose}
              disabled={loading || ticket.status === "CLOSED"}
            >
              {ticket.status === "CLOSED" ? "Ya entregado" : (loading ? "Cerrando..." : "Cobrar y entregar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
