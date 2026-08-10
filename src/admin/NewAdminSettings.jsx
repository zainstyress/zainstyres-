import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { notify } from "./adminUtils";

const defaults = {
  shopName: "Zain's Tyres",
  whatsappNumber: "91XXXXXXXXXX",
  instagram: "",
  facebook: "",
  twitter: "",
  heroHeading: "",
  heroSubheading: "",
  marqueeText: "INDIA'S #1 RATED...",
  currency: "INR",
  maintenanceMode: false,
};

export default function NewAdminSettings() {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) setSettings({ ...defaults, ...snap.data() });
    });
    return () => unsub();
  }, []);

  const set = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const save = async () => {
    await setDoc(doc(db, "settings", "global"), settings, { merge: true });
    notify("Settings saved");
  };

  return (
    <section>
      <h1>Site Settings</h1>
      <div className="za-form">
        {["shopName", "whatsappNumber", "instagram", "facebook", "twitter", "heroHeading", "heroSubheading", "marqueeText"].map((key) => (
          <input key={key} value={settings[key] || ""} onChange={(e) => set(key, e.target.value)} placeholder={key} />
        ))}
        <input disabled value="INR" />
        <label><input checked={settings.maintenanceMode} type="checkbox" onChange={(e) => set("maintenanceMode", e.target.checked)} /> Maintenance mode</label>
        <button type="button" onClick={save}>SAVE</button>
      </div>
    </section>
  );
}
