import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/adminPro.css";
import "../styles/landing.css";

import { db } from "../config/firebase";
import { doc, getDoc, query, collection, where, getDocs, limit } from "firebase/firestore";
import { getCurrentPricingPublic } from "../services/pricingPublicService";

function normalizeToken(v) {
  return (v || "").trim().toUpperCase();
}

function safeStr(v, fallback = "-") {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function toDateMaybe(ts) {
  // Firestore Timestamp -> Date
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

function formatDateTime(d) {
  if (!d) return "-";
  try {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toString();
  }
}

function minutesBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function hoursFromMinutes(mins) {
  return mins / 60;
}

function ceilToMinHours(hours, minHours, rounding) {
  // rounding: "CEIL" | "FLOOR" | "ROUND"
  const min = Math.max(0, Number(minHours || 0));
  let h = Number(hours || 0);

  if (rounding === "FLOOR") h = Math.floor(h);
  else if (rounding === "ROUND") h = Math.round(h);
  else h = Math.ceil(h); // CEIL default

  if (h < min) h = min;
  if (!Number.isFinite(h)) h = min;
  return h;
}

function normalizeStatus(s) {
  const v = String(s || "").toUpperCase().trim();
  if (["DELIVERED", "CLOSED", "DONE", "ENTREGADO"].includes(v)) return "DELIVERED";
  if (["ACTIVE", "OPEN", "ABIERTO", "ACTIVO"].includes(v)) return "ACTIVE";
  return v || "ACTIVE";
}

export default function TagPublic() {
  const { token: tokenParam } = useParams();
  const token = useMemo(() => normalizeToken(tokenParam), [tokenParam]);
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [ticket, setTicket] = useState(null);
  const [branch, setBranch] = useState(null);
  const [pricing, setPricing] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // 1) ticket por token (query)
      const q = query(
        collection(db, "tickets"),
        where("token", "==", token),
        limit(1)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setTicket(null);
        setBranch(null);
        setPricing(await getCurrentPricingPublic());
        setErr("No se encontró un resguardo con este código. Verifica el token.");
        return;
      }

      const docSnap = snap.docs[0];
      const t = { id: docSnap.id, ...docSnap.data() };
      setTicket(t);

      // 2) branch (si hay branchId)
      if (t.branchId) {
        const bRef = doc(db, "branches", t.branchId);
        const bSnap = await getDoc(bRef);
        if (bSnap.exists()) setBranch({ id: bSnap.id, ...bSnap.data() });
        else setBranch(null);
      } else {
        setBranch(null);
      }

      // 3) pricing/current
      const p = await getCurrentPricingPublic();
      setPricing(p);
    } catch (e) {
      console.error("TagPublic load error:", e);
      setErr(e?.message || "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------- MAPEO de campos (ajústalo si tu esquema difiere) ----------
  const mapped = useMemo(() => {
    if (!ticket) return null;

    const status = normalizeStatus(ticket.status);

    const createdAt =
      toDateMaybe(ticket.createdAt) ||
      toDateMaybe(ticket.checkInAt) ||
      toDateMaybe(ticket.startAt) ||
      null;

    const deliveredAt =
      toDateMaybe(ticket.deliveredAt) ||
      toDateMaybe(ticket.closedAt) ||
      toDateMaybe(ticket.checkOutAt) ||
      null;

    const type = safeStr(ticket.type, safeStr(ticket.itemType, "BOLSA")).toUpperCase();
    const qty = Number(ticket.qty ?? ticket.quantity ?? 1) || 1;
    const notes = safeStr(ticket.notes ?? ticket.note ?? "", "");

    return {
      id: ticket.id,
      token: safeStr(ticket.token, token),
      status,
      branchId: ticket.branchId || null,
      type,
      qty,
      notes,
      createdAt,
      deliveredAt,
    };
  }, [ticket, token]);

  const cost = useMemo(() => {
    if (!mapped || !pricing) return null;

    const hourlyMap = pricing.hourly || {};
    const perHour = Number(hourlyMap[mapped.type] ?? hourlyMap[mapped.type?.toUpperCase?.()] ?? 0) || 0;

    const start = mapped.createdAt;
    const end = mapped.status === "DELIVERED" && mapped.deliveredAt ? mapped.deliveredAt : new Date();

    if (!start) {
      return {
        perHour,
        hoursRaw: 0,
        hoursCharged: pricing.minHours ?? 1,
        total: (pricing.minHours ?? 1) * perHour * mapped.qty,
      };
    }

    const mins = minutesBetween(start, end);
    const hoursRaw = hoursFromMinutes(mins);
    const hoursCharged = ceilToMinHours(hoursRaw, pricing.minHours ?? 1, pricing.rounding || "CEIL");

    const total = hoursCharged * perHour * mapped.qty;

    return {
      perHour,
      mins,
      hoursRaw,
      hoursCharged,
      total,
    };
  }, [mapped, pricing]);

  const statusChip = useMemo(() => {
    const st = mapped?.status;
    if (st === "DELIVERED") return <span className="chip green">Entregado</span>;
    return <span className="chip blue">En resguardo</span>;
  }, [mapped]);

  const branchView = useMemo(() => {
    if (!branch) return null;
    return {
      name: safeStr(branch.name),
      address: safeStr(branch.address),
      phone: safeStr(branch.phone),
      openTime: safeStr(branch.openTime, "08:00"),
      closeTime: safeStr(branch.closeTime, "20:00"),
      locationName: safeStr(branch.locationName, "-"),
      mapsUrl: branch.mapsUrl ? String(branch.mapsUrl) : "",
    };
  }, [branch]);

  return (
    <div className="lp" style={{ paddingTop: 18 }}>
      <div className="card" style={{ maxWidth: 980, margin: "0 auto", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="lp-logo">TG</div>
            <div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>TAG-GO · Estado del resguardo</div>
              <div className="lp-muted">Consulta pública por QR / código</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn" onClick={() => nav("/")} type="button">
              Volver al inicio
            </button>
            <button className="btn" onClick={load} disabled={loading} type="button">
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {err && <div className="error-box" style={{ marginTop: 12 }}>{err}</div>}

        {!mapped && !loading && !err && (
          <div className="lp-muted" style={{ marginTop: 12 }}>No hay datos para mostrar.</div>
        )}

        {mapped && (
          <>
            {/* RESUMEN */}
            <div className="card" style={{ marginTop: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div className="lp-muted">Código</div>
                  <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: 1 }}>
                    {mapped.token}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {statusChip}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <div className="card" style={{ padding: 12 }}>
                  <div className="lp-muted">Tipo</div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{mapped.type}</div>
                </div>

                <div className="card" style={{ padding: 12 }}>
                  <div className="lp-muted">Cantidad</div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{mapped.qty}</div>
                </div>

                <div className="card" style={{ padding: 12 }}>
                  <div className="lp-muted">Ingreso</div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{formatDateTime(mapped.createdAt)}</div>
                </div>

                <div className="card" style={{ padding: 12 }}>
                  <div className="lp-muted">{mapped.status === "DELIVERED" ? "Entrega" : "Entrega (pendiente)"}</div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {mapped.status === "DELIVERED" ? formatDateTime(mapped.deliveredAt) : "-"}
                  </div>
                </div>
              </div>

              {mapped.notes && (
                <div className="card" style={{ padding: 12, marginTop: 12 }}>
                  <div className="lp-muted">Notas</div>
                  <div style={{ fontWeight: 800 }}>{mapped.notes}</div>
                </div>
              )}
            </div>

            {/* SUCURSAL */}
            <div
              className="card"
              style={{
                marginTop: 14,
                padding: 14,
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>Sucursal</div>

                {branchView ? (
                  <>
                    <div style={{ fontWeight: 950, fontSize: 18 }}>{branchView.name}</div>
                    <div className="lp-muted" style={{ marginTop: 6 }}>
                      {branchView.address}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12, marginTop: 10 }}>
                      <div className="card" style={{ padding: 12 }}>
                        <div className="lp-muted">Teléfono</div>
                        <div style={{ fontWeight: 900 }}>{branchView.phone}</div>
                      </div>
                      <div className="card" style={{ padding: 12 }}>
                        <div className="lp-muted">Horario</div>
                        <div style={{ fontWeight: 900 }}>{branchView.openTime} – {branchView.closeTime}</div>
                      </div>
                      <div className="card" style={{ padding: 12 }}>
                        <div className="lp-muted">Ubicación (Nombre)</div>
                        <div style={{ fontWeight: 900 }}>{branchView.locationName}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="lp-muted">No hay sucursal asociada en el ticket.</div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>Acciones</div>
                  {branchView?.mapsUrl ? (
                    <a className="btn btn-primary" href={branchView.mapsUrl} target="_blank" rel="noreferrer">
                      Abrir en Google Maps
                    </a>
                  ) : (
                    <button className="btn" disabled>Sin link de mapa</button>
                  )}
                </div>

                <div className="card" style={{ padding: 12 }}>
                  <div className="lp-muted">Tip</div>
                  <div style={{ fontWeight: 800 }}>
                    Guarda una foto del código por si se te pierde la etiqueta.
                  </div>
                </div>
              </div>
            </div>

            {/* COSTO */}
            <div className="card" style={{ marginTop: 14, padding: 14 }}>
              <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 8 }}>
                Costo {mapped.status === "DELIVERED" ? "final" : "estimado hasta ahora"}
              </div>

              {pricing ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div className="card" style={{ padding: 12 }}>
                    <div className="lp-muted">Tarifa por hora</div>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>
                      Bs. {cost?.perHour || 0} <span className="lp-price-unit">/ hora</span>
                    </div>
                  </div>

                  <div className="card" style={{ padding: 12 }}>
                    <div className="lp-muted">Reglas</div>
                    <div style={{ fontWeight: 900 }}>
                      Mínimo: {pricing.minHours}h · Redondeo: {pricing.rounding}
                    </div>
                  </div>

                  <div className="card" style={{ padding: 12 }}>
                    <div className="lp-muted">Horas cobradas</div>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>
                      {cost?.hoursCharged ?? "-"}h
                    </div>
                    {mapped.createdAt && (
                      <div className="lp-muted" style={{ marginTop: 6 }}>
                        Tiempo real: {Math.round((cost?.hoursRaw || 0) * 10) / 10}h
                      </div>
                    )}
                  </div>

                  <div className="card" style={{ padding: 12 }}>
                    <div className="lp-muted">Total</div>
                    <div style={{ fontWeight: 950, fontSize: 18 }}>
                      Bs. {cost?.total ?? "-"}
                    </div>
                    <div className="lp-muted" style={{ marginTop: 6 }}>
                      (incluye cantidad × {mapped.qty})
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lp-muted">Cargando reglas de precios...</div>
              )}

              <div className="lp-muted" style={{ marginTop: 10 }}>
                * Este cálculo es informativo. El monto final se confirma en el check-out.
              </div>
            </div>

            {/* QUÉ HACER AHORA */}
            <div className="card" style={{ marginTop: 14, padding: 14 }}>
              <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 8 }}>
                ¿Qué hacer ahora?
              </div>

              {mapped.status === "DELIVERED" ? (
                <div className="card" style={{ padding: 12, borderColor: "rgba(34,197,94,0.25)" }}>
                  ✅ Este resguardo ya fue entregado. Si necesitas soporte, contacta a la sucursal.
                </div>
              ) : (
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Para recoger tu objeto</div>
                  <ul className="lp-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                    <li>Dirígete a la sucursal indicada.</li>
                    <li>Presenta este código: <b>{mapped.token}</b> (o la etiqueta QR).</li>
                    <li>El personal verificará y registrará la entrega.</li>
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
