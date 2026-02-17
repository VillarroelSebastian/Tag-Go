import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-badge">TG</div>
        <div>
          <div className="sidebar-title">TAG-GO</div>
          <div className="sidebar-subtitle">Administración</div>
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/app/dashboard">Dashboard</NavLink>
        <NavLink to="/app/checkin">Check-in</NavLink>
        <NavLink to="/app/checkout">Check-out</NavLink>
        <NavLink to="/app/tickets">Tickets</NavLink>
        <NavLink to="/app/pricing">Tarifas</NavLink>
        <NavLink to="/app/branches">Sucursales</NavLink>
      </nav>
    </aside>
  );
}
