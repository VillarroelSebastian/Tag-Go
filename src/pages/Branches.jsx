import { useEffect, useMemo, useState } from "react";
import "../styles/forms.css";
import "../styles/adminPro.css";
import {
  createBranch,
  deleteBranch,
  listBranches,
  toggleBranchActive,
  updateBranch,
} from "../services/branchService";

function emptyForm() {
  return {
    name: "",
    address: "",
    phone: "",
    openTime: "08:00",
    closeTime: "20:00",
    locationName: "", // NUEVO
    mapsUrl: "",      // NUEVO
  };
}

export default function Branches() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");

  const [branches, setBranches] = useState([]);

  // create form
  const [form, setForm] = useState(emptyForm());

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm());

  async function load() {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const data = await listBranches();
      setBranches(data);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar sucursales.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return branches;
    return branches.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(s) ||
        (b.address || "").toLowerCase().includes(s) ||
        (b.phone || "").toLowerCase().includes(s) ||
        (b.locationName || "").toLowerCase().includes(s) // NUEVO
    );
  }, [q, branches]);

  function isValidMapsUrl(url) {
    if (!url) return true;
    return url.startsWith("http://") || url.startsWith("https://");
  }

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (form.name.trim().length < 3) return setErr("Nombre de sucursal inválido.");
    if (!isValidMapsUrl(form.mapsUrl.trim()))
      return setErr("El link de Google Maps debe empezar con http(s).");

    setLoading(true);
    try {
      await createBranch({ ...form, active: true });
      setForm(emptyForm());
      setOk("Sucursal creada ✅");
      await load();
    } catch (e2) {
      setErr(e2?.message || "No se pudo crear sucursal.");
    } finally {
      setLoading(false);
    }
  }

  function openEdit(b) {
    setEditId(b.id);
    setEditForm({
      name: b.name || "",
      address: b.address || "",
      phone: b.phone || "",
      openTime: b.openTime || "08:00",
      closeTime: b.closeTime || "20:00",
      locationName: b.locationName || "", // NUEVO
      mapsUrl: b.mapsUrl || "",           // NUEVO
    });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!editId) return;
    setErr("");
    setOk("");

    if (editForm.name.trim().length < 3) return setErr("Nombre inválido.");
    if (!isValidMapsUrl(editForm.mapsUrl.trim()))
      return setErr("El link de Google Maps debe empezar con http(s).");

    setLoading(true);
    try {
      await updateBranch(editId, { ...editForm });
      setOk("Sucursal actualizada ✅");
      setEditOpen(false);
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo actualizar sucursal.");
    } finally {
      setLoading(false);
    }
  }

  async function onToggle(b) {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      await toggleBranchActive(b.id, !b.active);
      setOk("Estado actualizado ✅");
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo cambiar el estado.");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(b) {
    const confirm1 = confirm(
      `¿Eliminar sucursal "${b.name}"?\nEsto no se puede deshacer.`
    );
    if (!confirm1) return;

    setErr("");
    setOk("");
    setLoading(true);
    try {
      await deleteBranch(b.id);
      setOk("Sucursal eliminada ✅");
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo eliminar sucursal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div className="toolbar-left">
          <div>
            <h2 style={{ marginBottom: 4 }}>Sucursales</h2>
            <div className="muted">
              Crea, edita, desactiva o elimina puntos de resguardo.
            </div>
          </div>
        </div>
        <div className="toolbar-right">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar sucursal..."
          />
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "..." : "Actualizar"}
          </button>
        </div>
      </div>

      {ok && (
        <div
          className="card"
          style={{
            padding: 12,
            borderColor: "rgba(34,197,94,0.25)",
            marginBottom: 10,
          }}
        >
          {ok}
        </div>
      )}
      {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Nueva sucursal</div>
        <form onSubmit={onCreate} className="form">
          <div className="row-2">
            <div className="field">
              <label>Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sucursal Centro"
              />
            </div>
            <div className="field">
              <label>Teléfono (opcional)</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="70123456"
              />
            </div>
          </div>

          <div className="field">
            <label>Dirección (opcional)</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Av. ... #..."
            />
          </div>

          {/* NUEVOS CAMPOS */}
          <div className="row-2">
            <div className="field">
              <label>Ubicación (Nombre)</label>
              <input
                value={form.locationName}
                onChange={(e) => setForm({ ...form, locationName: e.target.value })}
                placeholder='Ej: "Ubicación Central" o "Zona Norte"'
              />
            </div>

            <div className="field">
              <label>Link Google Maps (ubicación)</label>
              <input
                value={form.mapsUrl}
                onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>

          <div className="row-2">
            <div className="field">
              <label>Abre</label>
              <input
                type="time"
                value={form.openTime}
                onChange={(e) => setForm({ ...form, openTime: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Cierra</label>
              <input
                type="time"
                value={form.closeTime}
                onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
              />
            </div>
          </div>

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Creando..." : "Crear sucursal"}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table-pro">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Horario</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Ubicación (Nombre)</th>
              <th>Maps</th>
              <th>Estado</th>
              <th style={{ width: 260 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id}>
                <td style={{ fontWeight: 900 }}>{b.name}</td>
                <td>{b.openTime} - {b.closeTime}</td>
                <td>{b.phone || "-"}</td>
                <td>{b.address || "-"}</td>
                <td>{b.locationName || "-"}</td>
                <td>
                  {b.mapsUrl ? (
                    <a
                      href={b.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#60a5fa", fontWeight: 700 }}
                    >
                      Ver mapa
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {b.active ? (
                    <span className="chip green">Activa</span>
                  ) : (
                    <span className="chip red">Inactiva</span>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => openEdit(b)}>
                      Editar
                    </button>
                    <button className="btn" onClick={() => onToggle(b)} disabled={loading}>
                      {b.active ? "Desactivar" : "Activar"}
                    </button>
                    <button className="btn btn-danger" onClick={() => onDelete(b)} disabled={loading}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="muted" style={{ padding: 14 }}>
                  No hay sucursales (o tu búsqueda no encontró nada).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editOpen && (
        <div className="modal-backdrop" onMouseDown={() => setEditOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Editar sucursal</div>
              <button className="btn" onClick={() => setEditOpen(false)}>Cerrar</button>
            </div>

            <div className="modal-body">
              <div className="row-2">
                <div className="field">
                  <label>Nombre</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label>Dirección</label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              {/* NUEVOS CAMPOS EN MODAL */}
              <div className="row-2">
                <div className="field">
                  <label>Ubicación (Nombre)</label>
                  <input
                    value={editForm.locationName}
                    onChange={(e) => setEditForm({ ...editForm, locationName: e.target.value })}
                    placeholder='Ej: "Ubicación Central"'
                  />
                </div>
                <div className="field">
                  <label>Link Google Maps</label>
                  <input
                    value={editForm.mapsUrl}
                    onChange={(e) => setEditForm({ ...editForm, mapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label>Abre</label>
                  <input
                    type="time"
                    value={editForm.openTime}
                    onChange={(e) => setEditForm({ ...editForm, openTime: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Cierra</label>
                  <input
                    type="time"
                    value={editForm.closeTime}
                    onChange={(e) => setEditForm({ ...editForm, closeTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="row-actions">
                <button className="btn btn-primary" onClick={onSaveEdit} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
                <button className="btn" onClick={() => setEditOpen(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
