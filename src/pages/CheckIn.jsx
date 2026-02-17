import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/forms.css";
import "../styles/adminPro.css";

import { auth } from "../config/firebase";
import { createTicket } from "../services/ticketService";
import { listBranches } from "../services/branchService";

import QRCode from "qrcode";

const ITEM_TYPES = [
  { value: "BOLSA", label: "Bolsa" },
  { value: "MOCHILA", label: "Mochila" },
  { value: "MALETA", label: "Maleta" },
];

export default function CheckIn() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [branches, setBranches] = useState([]);

  const [branchId, setBranchId] = useState("");
  const [itemType, setItemType] = useState("MOCHILA");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // { token, id, qrDataUrl, branchName, itemTypeLabel, quantity }
  const [generated, setGenerated] = useState(null);

  const printBtnRef = useRef(null);

  async function loadBranches() {
    setErr("");
    try {
      const all = await listBranches();
      const activeOnly = all.filter((b) => b.active);
      setBranches(activeOnly);

      if (!branchId && activeOnly.length > 0) setBranchId(activeOnly[0].id);
    } catch (e) {
      setErr(e?.message || "No se pudieron cargar sucursales.");
    }
  }

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branchObj = useMemo(() => branches.find((b) => b.id === branchId), [branches, branchId]);
  const branchLabel = branchObj?.name || "-";
  const typeLabel = ITEM_TYPES.find((t) => t.value === itemType)?.label || itemType;

  function makePublicUrlFromToken(token) {
    // QR apunta a tu página pública /t/:token
    return `${window.location.origin}/t/${encodeURIComponent(token)}`;
  }

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setGenerated(null);

    if (!branchId) return setErr("Selecciona una sucursal activa.");
    if (Number(quantity) < 1) return setErr("Cantidad inválida.");

    setLoading(true);
    try {
      const qty = Number(quantity);

      const res = await createTicket({
        branchId,
        itemType,
        quantity: qty,
        notes,
        createdBy: auth.currentUser?.uid ?? null,
      });

      const url = makePublicUrlFromToken(res.token);

      // Generar QR como imagen (dataURL)
      const qrDataUrl = await QRCode.toDataURL(url, {
        margin: 1,
        scale: 8,
        errorCorrectionLevel: "M",
      });

      setGenerated({
        id: res.id,
        token: res.token,
        qrDataUrl,
        branchName: branchLabel,
        itemTypeLabel: typeLabel,
        quantity: qty,
      });

      setOk(`Ticket creado ✅ Sucursal: ${branchLabel}`);
      setNotes("");
      setQuantity(1);

      setTimeout(() => printBtnRef.current?.focus?.(), 50);
    } catch (e2) {
      console.error("Check-in error:", e2);
      setErr(e2?.message || "No se pudo crear el ticket.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function printLabel() {
    if (!generated?.qrDataUrl) return;

    const w = window.open("", "_blank", "width=520,height=700");
    if (!w) return;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta - ${generated.token}</title>
  <style>
    @page { size: auto; margin: 12mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .wrap { display: grid; place-items: center; padding: 10px; }
    .card {
      width: 360px;
      border: 1px solid #111827;
      border-radius: 14px;
      padding: 14px;
    }
    .brand { font-weight: 800; font-size: 18px; letter-spacing: 0.5px; }
    .muted { color: #334155; font-size: 12px; margin-top: 2px; }
    .token { font-weight: 900; font-size: 22px; letter-spacing: 2px; margin-top: 8px; text-align:center; }
    .qr { display:flex; justify-content:center; margin-top: 10px; }
    img { width: 240px; height: 240px; }
    .meta { margin-top: 10px; font-size: 12px; display: grid; gap: 6px; }
    .row { display:flex; justify-content:space-between; gap: 10px; }
    .k { color:#334155; }
    .v { font-weight: 700; color:#0f172a; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="brand">TAG-GO</div>
      <div class="muted">Etiqueta de resguardo</div>

      <div class="qr">
        <img src="${generated.qrDataUrl}" />
      </div>

      <div class="token">${escapeHtml(generated.token)}</div>

      <div class="meta">
        <div class="row"><div class="k">Sucursal</div><div class="v">${escapeHtml(generated.branchName)}</div></div>
        <div class="row"><div class="k">Tipo</div><div class="v">${escapeHtml(generated.itemTypeLabel)}</div></div>
        <div class="row"><div class="k">Cantidad</div><div class="v">${escapeHtml(String(generated.quantity))}</div></div>
      </div>
    </div>
  </div>

  <script>
    window.onload = () => {
      window.focus();
      window.print();
      setTimeout(() => window.close(), 300);
    };
  </script>
</body>
</html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div className="toolbar-left">
          <div>
            <h2 style={{ marginBottom: 4 }}>Check-in (Recepción)</h2>
            <div className="muted">Registra el resguardo y genera el token + QR.</div>
          </div>
        </div>

        <div className="toolbar-right">
          <button className="btn" onClick={loadBranches} disabled={loading}>
            {loading ? "..." : "Actualizar sucursales"}
          </button>
        </div>
      </div>

      {ok && (
        <div className="card" style={{ padding: 12, borderColor: "rgba(34,197,94,0.25)", marginBottom: 10 }}>
          {ok}
        </div>
      )}
      {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

      {branches.length === 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>No hay sucursales activas</div>
          <div className="muted">Ve a “Sucursales” y crea/activa al menos una para poder hacer check-in.</div>
        </div>
      )}

      <form onSubmit={onCreate} className="form">
        <div className="row-2">
          <div className="field">
            <label>Sucursal (solo activas)</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={branches.length === 0}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tipo</label>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Cantidad</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>

          <div className="field">
            <label>Notas (opcional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Color / características / cliente..." />
          </div>
        </div>

        <button className="btn btn-primary" disabled={loading || branches.length === 0}>
          {loading ? "Generando..." : "Crear ticket"}
        </button>
      </form>

      {generated && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div className="muted">Token generado</div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: 2 }}>{generated.token}</div>

              <div className="row-actions" style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => copy(generated.token)}>Copiar token</button>
                <button
                  ref={printBtnRef}
                  className="btn btn-primary"
                  type="button"
                  onClick={printLabel}
                >
                  Imprimir etiqueta
                </button>
              </div>

              <div className="muted" style={{ marginTop: 8 }}>
                Sucursal: <b>{generated.branchName}</b> · {generated.itemTypeLabel} x {generated.quantity}
              </div>
            </div>

            <div style={{ marginLeft: "auto" }}>
              <div className="muted" style={{ marginBottom: 6 }}>QR</div>
              <img
                src={generated.qrDataUrl}
                alt="QR"
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "white",
                  padding: 8,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
