import { db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getCurrentPricingPublic() {
  const ref = doc(db, "pricing", "current");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() || {};
  return {
    hourly: data.hourly || {},        // { BOLSA: 2, ... }
    minHours: data.minHours ?? 1,
    rounding: data.rounding || "CEIL",
    updatedAt: data.updatedAt || null,
  };
}
