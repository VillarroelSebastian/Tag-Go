import { db } from "../config/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";

function makeToken(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function createTicket({ branchId, itemType, quantity, notes, createdBy }) {
  const token = makeToken(8);

  const docRef = await addDoc(collection(db, "tickets"), {
    token,
    branchId,
    itemType,
    quantity: Number(quantity),
    notes: notes || "",
    status: "ACTIVE", // ACTIVE | CLOSED
    paid: false,
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
    closedAt: null,
    priceAtClose: null,
    hoursBilled: null,
    closedBy: null,
  });

  return { id: docRef.id, token };
}

export async function getTicketByToken(token) {
  const q = query(collection(db, "tickets"), where("token", "==", token), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function closeTicket({ ticketId, priceAtClose, hoursBilled, paid = true, closedBy }) {
  const ref = doc(db, "tickets", ticketId);
  await updateDoc(ref, {
    status: "CLOSED",
    paid: !!paid,
    closedAt: serverTimestamp(),
    priceAtClose: Number(priceAtClose),
    hoursBilled: Number(hoursBilled),
    closedBy: closedBy || null,
  });
}

export async function listTicketsByStatus({ status, limitN = 100 }) {
  // Requiere índice si hay orderBy. Si Firestore lo pide, créalo.
  const field = status === "CLOSED" ? "closedAt" : "createdAt";
  const q = query(
    collection(db, "tickets"),
    where("status", "==", status),
    orderBy(field, "desc"),
    limit(limitN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTicketById(ticketId) {
  const ref = doc(db, "tickets", ticketId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
