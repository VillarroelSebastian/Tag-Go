import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";
import "../styles/adminPro.css";
import { listActiveBranchesPublic } from "../services/branchPublicService";
import { getCurrentPricingPublic } from "../services/pricingPublicService";
import QrScanner from "qr-scanner";

function normalizeToken(v) {
  return (v || "").trim().toUpperCase();
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function prettyType(k) {
  const s = String(k || "").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractTokenFromQrText(text) {
  // acepta URL o token directo
  const raw = String(text || "").trim();
  if (!raw) return "";

  // Si viene como URL .../t/AB12CD34
  try {
    const u = new URL(raw);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "t");
    if (idx >= 0 && parts[idx + 1]) return normalizeToken(parts[idx + 1]);
  } catch {
    // no es URL, sigue como token
  }

  // Token directo
  return normalizeToken(raw);
}

export default function Landing() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [branches, setBranches] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [token, setToken] = useState("");

  // QR UI
  const [qrOpen, setQrOpen] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrInfo, setQrInfo] = useState("");

  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [b, p] = await Promise.all([
        listActiveBranchesPublic(),
        getCurrentPricingPublic(),
      ]);
      setBranches(b);
      setPricing(p);
    } catch (e) {
      console.error("Landing load error:", e);
      setErr(e?.message || "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const stats = useMemo(() => {
    const n = branches.length;
    return {
      branchesLabel: n === 1 ? "1 sucursal activa" : `${n} sucursales activas`,
      infoLabel: n > 0 ? "Encuentra una sucursal cerca de ti" : "Pronto más sucursales",
    };
  }, [branches]);

  const pricingItems = useMemo(() => {
    const hourly = pricing?.hourly || {};
    return Object.entries(hourly)
      .map(([k, v]) => ({ key: k, price: v }))
      .sort((a, b) => String(a.key).localeCompare(String(b.key)));
  }, [pricing]);

  function onTrack(e) {
    e.preventDefault();
    setErr("");
    const t = normalizeToken(token);
    if (t.length < 4) return setErr("Ingresa un código válido.");
    nav(`/t/${encodeURIComponent(t)}`);
  }

  // ---------- QR: Cámara ----------
  async function startCameraScanner() {
    setQrError("");
    setQrInfo("");

    try {
      if (!videoRef.current) return;

      // Si no hay cámara, avisar
      const hasCam = await QrScanner.hasCamera();
      if (!hasCam) {
        setQrError("No se detectó cámara en este dispositivo.");
        return;
      }

      // crear scanner
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const txt = result?.data || result;
          const extracted = extractTokenFromQrText(txt);
          if (extracted) {
            setQrInfo(`Código detectado: ${extracted}`);
            stopCameraScanner();
            nav(`/t/${encodeURIComponent(extracted)}`);
          } else {
            setQrError("Se detectó un QR, pero no se pudo leer el código.");
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setQrInfo("Cámara encendida. Apunta al QR.");
    } catch (e) {
      console.error(e);
      setQrError("No se pudo iniciar la cámara. Revisa permisos del navegador.");
    }
  }

  async function stopCameraScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    } catch {
      // ignore
    }
  }

  // cuando se cierre el modal: apagar cámara
  useEffect(() => {
    if (!qrOpen) stopCameraScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen]);

  // ---------- QR: Subir imagen ----------
  async function onQrImageUpload(e) {
    setQrError("");
    setQrInfo("");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const extracted = extractTokenFromQrText(result?.data);
      if (!extracted) {
        setQrError("No se pudo extraer el código del QR en la imagen.");
        return;
      }
      setQrInfo(`Código detectado: ${extracted}`);
      nav(`/t/${encodeURIComponent(extracted)}`);
    } catch (err2) {
      console.error(err2);
      setQrError("No se pudo leer el QR. Prueba con una foto más clara.");
    } finally {
      // permite volver a subir el mismo archivo
      e.target.value = "";
    }
  }

  return (
    <div className="lp">
      {/* NAV */}
      <header className="lp-nav">
        <div className="lp-brand" onClick={() => nav("/")}>
          <div className="lp-logo">TG</div>
          <div>
            <div className="lp-title">TAG-GO</div>
            <div className="lp-subtitle">Resguardo seguro con QR</div>
          </div>
        </div>

        <nav className="lp-links">
          <button className="lp-link" onClick={() => scrollToId("how")}>
            Cómo funciona
          </button>
          <button className="lp-link" onClick={() => scrollToId("branches")}>
            Sucursales
          </button>
          <button className="lp-link" onClick={() => scrollToId("pricing")}>
            Precios
          </button>
          <button className="lp-link" onClick={() => scrollToId("faq")}>
            FAQ
          </button>
        </nav>

        <div className="lp-nav-actions">
          <button className="btn" onClick={() => nav("/login")}>
            Login Administrador
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-left">
          <div className="lp-pill-row">
            <span className="lp-pill">QR + Código</span>
            <span className="lp-pill lp-pill-green">{stats.branchesLabel}</span>
            <span className="lp-pill">Seguimiento online</span>
            <span className="lp-pill">{stats.infoLabel}</span>
          </div>

          <h1 className="lp-h1">Deja tus objetos y recógelos cuando quieras</h1>
          <p className="lp-p">
            TAG-GO te permite dejar bolsos, mochilas, maletas u objetos personales
            en un punto de resguardo. Te entregamos una etiqueta con QR y un{" "}
            <b>código de seguimiento</b>. Con ese código puedes consultar el estado
            del resguardo desde esta misma página.
          </p>

          <div className="lp-cta-row">
            <button className="btn btn-primary" onClick={() => scrollToId("branches")}>
              Ver sucursales
            </button>
            <button className="btn" onClick={() => scrollToId("how")}>
              Cómo funciona
            </button>
            <button className="btn" onClick={() => scrollToId("pricing")}>
              Ver precios
            </button>
          </div>

          {/* TRACK */}
          <div className="lp-track card">
            <div className="lp-track-head">
              <div>
                <div className="lp-kicker">Seguimiento</div>
                <div className="lp-track-title">Consulta tu resguardo</div>
                <div className="lp-muted" style={{ marginTop: 6 }}>
                  Puedes ingresar el código o escanear/subir una foto del QR.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={() => setQrOpen(true)}>
                  Escanear / Subir QR
                </button>
              </div>
            </div>

            <form className="lp-track-form" onSubmit={onTrack}>
              <input
                className="input lp-track-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Ej: AB12CD34"
              />
              <button className="btn btn-primary lp-track-btn" type="submit">
                Ver estado
              </button>
            </form>

            {err && <div className="error-box" style={{ marginTop: 10 }}>{err}</div>}
          </div>
        </div>

        <div className="lp-hero-right">
          <div className="lp-mock card">
            <div className="lp-mock-top">
              <span className="lp-pill">Seguro</span>
              <span className="lp-pill">Rápido</span>
              <span className="lp-pill lp-pill-green">Con QR</span>
            </div>

            <div className="lp-mock-body">
              <div className="lp-kicker">Ejemplo de etiqueta</div>
              <div className="lp-mock-code">AB12CD34</div>

              <div className="lp-qr-box">
                <div className="lp-qr-placeholder" />
              </div>

              <div className="lp-muted" style={{ marginTop: 10 }}>
                Escanea el QR o ingresa el código para ver el estado del resguardo.
              </div>

              <div className="lp-mock-cta">
                <button className="btn btn-primary" onClick={() => scrollToId("branches")}>
                  Ver sucursales
                </button>
                <button className="btn" onClick={() => scrollToId("faq")}>
                  Preguntas frecuentes
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="lp-section" id="how">
        <div className="lp-section-head">
          <div>
            <h2 className="lp-h2">Cómo funciona</h2>
            <div className="lp-muted">
              Proceso simple y rápido: check-in, resguardo, seguimiento y entrega.
            </div>
          </div>
        </div>

        <div className="lp-how">
          <div className="lp-how-card card">
            <div className="lp-how-n">1</div>
            <div className="lp-how-title">Check-in (Ingreso)</div>
            <div className="lp-muted">
              Registramos el tipo, cantidad y notas. Se genera el código + QR.
            </div>
          </div>

          <div className="lp-how-card card">
            <div className="lp-how-n">2</div>
            <div className="lp-how-title">Resguardo</div>
            <div className="lp-muted">
              Guardamos tu objeto en la sucursal. Puedes verificar el estado cuando quieras.
            </div>
          </div>

          <div className="lp-how-card card">
            <div className="lp-how-n">3</div>
            <div className="lp-how-title">Check-out (Entrega)</div>
            <div className="lp-muted">
              Presentas tu código, verificamos y registramos la entrega.
            </div>
          </div>

          <div className="lp-how-card card">
            <div className="lp-how-n">4</div>
            <div className="lp-how-title">Cobro por hora</div>
            <div className="lp-muted">
              Se calcula según tarifa por tipo y la regla mínima configurada.
            </div>
          </div>
        </div>
      </section>

      {/* BRANCHES */}
      <section className="lp-section" id="branches">
        <div className="lp-section-head">
          <div>
            <h2 className="lp-h2">Sucursales</h2>
            <div className="lp-muted">
              Encuentra el punto de resguardo más cercano y abre la ubicación en Google Maps.
            </div>
          </div>

          <button className="btn" onClick={loadAll} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        <div className="lp-branches">
          {branches.map((b) => (
            <div className="lp-branch card" key={b.id}>
              <div className="lp-branch-top">
                <div className="lp-branch-name">{b.name}</div>
                <span className="chip green">Activa</span>
              </div>

              <div className="lp-branch-grid">
                <div>
                  <div className="lp-muted">Dirección</div>
                  <div className="lp-strong">{b.address || "-"}</div>
                </div>
                <div>
                  <div className="lp-muted">Teléfono</div>
                  <div className="lp-strong">{b.phone || "-"}</div>
                </div>
                <div>
                  <div className="lp-muted">Horario</div>
                  <div className="lp-strong">
                    {b.openTime || "08:00"} – {b.closeTime || "20:00"}
                  </div>
                </div>
                <div>
                  <div className="lp-muted">Ubicación (Nombre)</div>
                  <div className="lp-strong">{b.locationName || "-"}</div>
                </div>
              </div>

              <div className="lp-branch-actions">
                {b.mapsUrl ? (
                  <a className="btn btn-primary" href={b.mapsUrl} target="_blank" rel="noreferrer">
                    Ver en Google Maps
                  </a>
                ) : (
                  <button className="btn" disabled>Sin mapa</button>
                )}
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="lp-empty card">
              {loading ? "Cargando sucursales..." : "No hay sucursales activas todavía."}
            </div>
          )}
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-section" id="pricing">
        <div className="lp-section-head">
          <div>
            <h2 className="lp-h2">Precios por hora</h2>
            <div className="lp-muted">
              Tarifas oficiales cargadas desde la base de datos.
              {pricing?.minHours ? ` Mínimo: ${pricing.minHours} hora(s).` : ""}
              {pricing?.rounding ? ` Redondeo: ${pricing.rounding}.` : ""}
            </div>
          </div>
        </div>

        <div className="lp-pricing">
          {pricingItems.map((it) => (
            <div className="lp-price card" key={it.key}>
              <div className="lp-price-top">
                <div className="lp-price-name">{prettyType(it.key)}</div>
                <div className="lp-price-value">
                  Bs. {it.price} <span className="lp-price-unit">/ hora</span>
                </div>
              </div>
              <div className="lp-muted">
                Cobro por hora según el tipo de objeto. Al retirar se calcula el total.
              </div>
            </div>
          ))}

          {pricingItems.length === 0 && (
            <div className="lp-empty card">
              {loading ? "Cargando precios..." : "No hay tarifas configuradas todavía."}
            </div>
          )}
        </div>

        {pricing && (
          <div className="lp-callout card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Reglas de cobro</div>
            <div className="lp-muted">
              Se aplica un mínimo de <b>{pricing.minHours}</b> hora(s) y el redondeo configurado
              (<b>{pricing.rounding}</b>). El detalle final se confirma al momento del check-out.
            </div>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="lp-section" id="faq">
        <div className="lp-section-head">
          <div>
            <h2 className="lp-h2">Preguntas frecuentes</h2>
            <div className="lp-muted">Respuestas rápidas para clientes.</div>
          </div>
        </div>

        <div className="lp-faq">
          <details className="lp-faq-item card">
            <summary>¿Necesito registrarme para usar TAG-GO?</summary>
            <div className="lp-muted">No. Solo guarda tu código para consultar el estado.</div>
          </details>

          <details className="lp-faq-item card">
            <summary>¿Qué pasa si pierdo mi código?</summary>
            <div className="lp-muted">
              Depende del procedimiento de la sucursal. Recomendamos guardar una foto del código.
            </div>
          </details>

          <details className="lp-faq-item card">
            <summary>¿Dónde veo las sucursales y ubicación?</summary>
            <div className="lp-muted">
              En “Sucursales”, con botón para abrir Google Maps.
            </div>
          </details>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-muted">© {new Date().getFullYear()} TAG-GO · Resguardo con QR</div>
      </footer>

      {/* MODAL QR */}
      {qrOpen && (
        <div className="modal-backdrop" onMouseDown={() => setQrOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Escanear o subir QR</div>
              <button className="btn" onClick={() => setQrOpen(false)}>Cerrar</button>
            </div>

            <div className="modal-body">
              <div className="lp-muted" style={{ marginBottom: 10 }}>
                Usa la cámara para escanear el QR o sube una foto del código.
              </div>

              <div className="row-actions" style={{ marginBottom: 10 }}>
                <button className="btn btn-primary" onClick={startCameraScanner}>
                  Usar cámara
                </button>

                <label className="btn" style={{ cursor: "pointer" }}>
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onQrImageUpload}
                    style={{ display: "none" }}
                  />
                </label>

                <button className="btn" onClick={stopCameraScanner}>
                  Detener cámara
                </button>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Vista cámara</div>
                <video
                  ref={videoRef}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    background: "rgba(2,6,23,0.6)",
                    border: "1px solid rgba(148,163,184,0.18)",
                  }}
                />
                {qrInfo && (
                  <div className="card" style={{ padding: 10, marginTop: 10, borderColor: "rgba(34,197,94,0.25)" }}>
                    {qrInfo}
                  </div>
                )}
                {qrError && <div className="error-box" style={{ marginTop: 10 }}>{qrError}</div>}
              </div>

              <div className="lp-muted" style={{ marginTop: 10 }}>
                Nota: si el navegador no pide permiso, revisa el ícono de cámara en la barra de direcciones.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
