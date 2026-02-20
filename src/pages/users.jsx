import { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

// Importación corregida apuntando a la carpeta config
import { firebaseConfig } from "../config/firebase.js";

/**
 * Lógica: Crea un usuario sin cerrar la sesión del admin
 */
export async function createPanelUser({ email, password, displayName }) {
  if (!email || !password) throw new Error("Email y password son requeridos.");
  if (password.length < 6) throw new Error("Password mínimo 6 caracteres.");

  const secondaryName = "secondary";
  const secondaryApp =
    getApps().find((a) => a.name === secondaryName) ||
    initializeApp(firebaseConfig, secondaryName);

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password
    );

    if (displayName?.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }

    await signOut(secondaryAuth);

    return { 
      uid: cred.user.uid, 
      email: cred.user.email, 
      displayName: cred.user.displayName 
    };
  } catch (error) {
    console.error("Error en createPanelUser:", error);
    throw error;
  }
}

/**
 * INTERFAZ: Componente visual para la ruta /app/users
 */
export default function Users() {
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", type: "" });

    try {
      await createPanelUser({
        email: formData.email,
        password: formData.password,
        displayName: formData.name
      });
      setMsg({ text: "Usuario creado exitosamente.", type: "success" });
      setFormData({ email: "", password: "", name: "" }); // Reset
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="text-muted">Crea accesos adicionales para el personal administrativo.</p>
        </div>
      </header>

      <div className="card shadow-sm" style={{ maxWidth: '500px' }}>
        <h3 className="card-title">Nuevo Usuario</h3>
        
        {msg.text && (
          <div className={msg.type === "success" ? "chip green" : "error-box"} style={{ marginBottom: 15 }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: 0 }}>
          <div className="kv">
            <span className="k">Nombre Completo</span>
            <input 
              type="text" 
              className="input" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>

          <div className="kv">
            <span className="k">Correo Electrónico</span>
            <input 
              type="email" 
              className="input" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required 
            />
          </div>

          <div className="kv">
            <span className="k">Contraseña</span>
            <input 
              type="password" 
              className="input" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Mín. 6 caracteres"
              required 
            />
          </div>

          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Creando..." : "Registrar Usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}