import { db } from "../config/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * pricing/current
 * {
 *   hourly: { BOLSA: 5, MOCHILA: 8, MALETA: 12 },
 *   minHours: 1,
 *   rounding: "CEIL", // CEIL = cobra horas redondeando hacia arriba
 *   updatedAt
 * }
 */

const REF = doc(db, "pricing", "current");

export async function getPricing() {
  const snap = await getDoc(REF);
  if (!snap.exists()) {
    // defaults MVP
    return {
      hourly: { BOLSA: 5, MOCHILA: 8, MALETA: 12 },
      minHours: 1,
      rounding: "CEIL",
    };
  }
  return snap.data();
}

export async function savePricing(pricing) {
  await setDoc(
    REF,
    { ...pricing, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function computeCharge({ itemType, quantity, minutesElapsed, pricing }) {
  const minHours = Number(pricing?.minHours ?? 1);
  const hourly = pricing?.hourly ?? {};
  const rate = Number(hourly[itemType] ?? 0);
  const qty = Number(quantity ?? 1);

  const rawHours = minutesElapsed / 60;
  const roundedHours = pricing?.rounding === "CEIL" ? Math.ceil(rawHours) : rawHours;
  const hoursBilled = Math.max(minHours, roundedHours);

  const total = rate * qty * hoursBilled;
  return { total, hoursBilled, rate };
}
