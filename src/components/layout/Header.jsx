import { useLocation, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

const titles = {
  "/app/dashboard": "Dashboard",
  "/app/checkin": "Check-in (Ingreso)",
  "/app/checkout": "Check-out (Entrega)",
  "/app/tickets": "Tickets",
  "/app/pricing": "Tarifas",
  "/app/branches": "Sucursales",
};

export default function Header() {
  const loc = useLocation();
  const nav = useNavigate();
  const title = titles[loc.pathname] ?? "Panel";

  async function onLogout() {
    await logout();
    nav("/login");
  }

  return (
    <header className="header">
      <div className="header-title">{title}</div>

      <div className="header-actions">
        <button className="btn-small" onClick={() => nav("/landing")}>
          Ver Landing
        </button>
        <button className="btn-small" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
