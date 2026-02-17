import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function listActiveBranchesPublic() {
  const q = query(collection(db, "branches"), where("active", "==", true));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Ordenar en JS para no pedir índices
  data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return data;
}
