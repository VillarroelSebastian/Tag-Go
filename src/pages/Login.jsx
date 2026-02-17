import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { login } from "../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) return setError("Email inválido.");
    if (password.length < 6) return setError("Password mínimo 6 caracteres.");

    setLoading(true);
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err) {
      setError("Acceso denegado. Revisa tus credenciales.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-badge">TG</div>
          <div>
            <div className="title">TAG-GO</div>
            <div className="subtitle">Panel administrativo</div>
          </div>
        </div>

        <div className="title" style={{ marginTop: 6 }}>
          Acceso de administración
        </div>
        <div className="subtitle">
          Ingresa con tu cuenta de personal para registrar ingresos y entregas.
        </div>

        <form onSubmit={onSubmit} className="grid">
          <div className="field">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="admin@taggo.com"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="actions">
            <button className="btn-primary" disabled={loading}>
              {loading ? "Entrando..." : "Ingresar"}
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}
        </form>
      </div>
    </div>
  );
}
