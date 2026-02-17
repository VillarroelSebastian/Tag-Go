import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COL = "branches";

export async function listBranches() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

export async function createBranch(data) {
  // data puede incluir: name, address, phone, openTime, closeTime, locationName, mapsUrl, active
  const payload = {
    name: data.name || "",
    address: data.address || "",
    phone: data.phone || "",
    openTime: data.openTime || "08:00",
    closeTime: data.closeTime || "20:00",
    locationName: data.locationName || "",
    mapsUrl: data.mapsUrl || "",
    active: data.active ?? true,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COL), payload);
  return { id: ref.id };
}

export async function updateBranch(id, data) {
  // Solo actualiza los campos que mandes
  await updateDoc(doc(db, COL, id), {
    ...data,
  });
}

export async function toggleBranchActive(id, active) {
  await updateDoc(doc(db, COL, id), { active });
}

export async function deleteBranch(id) {
  await deleteDoc(doc(db, COL, id));
}
