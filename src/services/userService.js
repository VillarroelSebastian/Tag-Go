import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { firebaseConfig } from "../firebase";

/**
 * Crea un usuario SIN cambiar la sesión actual del admin,
 * usando un "secondary app".
 */
export async function createPanelUser({ email, password, displayName }) {
  if (!email || !password) throw new Error("Email y password son requeridos.");
  if (password.length < 6) throw new Error("Password mínimo 6 caracteres.");

  // Creamos (o reutilizamos) un app secundario
  const secondaryName = "secondary";
  const secondaryApp =
    getApps().find((a) => a.name === secondaryName) ||
    initializeApp(firebaseConfig, secondaryName);

  const secondaryAuth = getAuth(secondaryApp);

  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    email.trim(),
    password
  );

  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }

  // Importante: cerramos sesión del secondary auth
  await signOut(secondaryAuth);

  return { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName };
}