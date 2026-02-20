import { useEffect, useState, useMemo } from "react";
import "../styles/forms.css";
import "../styles/adminPro.css";
import { listTicketsByStatus } from "../services/ticketService";

// Sub-componente para consistencia de KPIs
const StatCard = ({ title, value, subtitle, type = "default" }) => (
  <div className={`card-stat ${type}`}>
    <span className="stat-label">{title}</span>
    <div className="stat-value">{value}</div>
    {subtitle && <span className="stat-subtitle">{subtitle}</span>}
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [activeCount, setActiveCount] = useState(0);
  const [recentClosed, setRecentClosed] = useState([]);

  // Formateador configurado para Bolivia (Bs)
  const currencyFormatter = new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  });

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [active, closed] = await Promise.all([
        listTicketsByStatus({ status: "ACTIVE", limitN: 200 }),
        listTicketsByStatus({ status: "CLOSED", limitN: 50 })
      ]);
      setActiveCount(active.length);
      setRecentClosed(closed);
    } catch (e) {
      setErr("Error de conexión. No se pudieron sincronizar las métricas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = recentClosed.reduce((sum, t) => sum + Number(t.priceAtClose || 0), 0);
    const count = recentClosed.length;
    const distribution = recentClosed.reduce((acc, t) => {
      const label = t.itemType || "Otros";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return { total, avg: count > 0 ? total / count : 0, distribution, count };
  }, [recentClosed]);

  // Lógica de Exportación a Excel ajustada
  const exportToExcel = () => {
    if (recentClosed.length === 0) return;

    const csvContent = [
      "sep=,", 
      "Token,Categoria,Monto (Bs),Fecha",
      ...recentClosed.map(t => 
        `${t.token},${t.itemType || 'N/A'},${t.priceAtClose || 0},${new Date().toLocaleDateString()}`
      )
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_ventas_bs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Panel de Control</h1>
          <p className="text-muted">Resumen de operaciones y métricas de cierre en Bs.</p>
        </div>
        
        <div className="toolbar-right" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={exportToExcel}>
             Excel (.csv)
          </button>
          
          <button className="btn btn-primary" onClick={() => window.print()}>
             Imprimir PDF
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={load} 
            disabled={loading}
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </header>

      {err && <div className="error-box" style={{ marginBottom: '20px' }}>{err}</div>}

      <div className="stats-grid">
        <StatCard 
          title="Tickets Activos" 
          value={activeCount} 
          subtitle="Pendientes en tablero"
        />
        <StatCard 
          title="Ingresos Totales" 
          value={currencyFormatter.format(stats.total)} 
          subtitle={`Últimos ${stats.count} cierres`}
          type="success"
        />
        <StatCard 
          title="Venta Promedio" 
          value={currencyFormatter.format(stats.avg)} 
          subtitle="Valor medio por ticket"
          type="info"
        />
        {/* Eficiencia eliminada según solicitud */}
      </div>

      <div className="dashboard-content-grid" style={{ marginTop: '24px' }}>
        <div className="card shadow-sm">
          <h3 className="card-title">Distribución por Categoría</h3>
          <div className="distribution-list">
            {Object.entries(stats.distribution).map(([label, val]) => {
              const percentage = ((val / stats.count) * 100).toFixed(1);
              return (
                <div key={label} className="dist-item">
                  <div className="dist-info">
                    <span>{label}</span>
                    <span className="text-bold">{percentage}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card shadow-sm">
          <h3 className="card-title">Auditoría de Cierres (Bs)</h3>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Categoría</th>
                  <th className="text-right">Monto Final</th>
                </tr>
              </thead>
              <tbody>
                {recentClosed.slice(0, 7).map((t) => (
                  <tr key={t.id}>
                    <td className="text-mono">{t.token}</td>
                    <td><span className="badge-light">{t.itemType}</span></td>
                    <td className="text-right text-bold">{currencyFormatter.format(t.priceAtClose)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}