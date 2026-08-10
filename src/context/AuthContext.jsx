import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

function notify(message) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message } }));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }) {
const API = import.meta.env.VITE_API_URL || "";
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseChecked, setFirebaseChecked] = useState(false);
  const [backendChecked, setBackendChecked] = useState(false);

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase auth is not initialized; skipping auth state listener.");
      setFirebaseChecked(true);
      return;
    }

    let unsub = () => {};

    try {
      unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);

          try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            setRole(userSnap.exists() ? userSnap.data().role || "user" : "user");
          } catch (error) {
            console.warn("Failed to load user profile from Firestore", error);
            setRole("user");
          }
        } else {
          setCurrentUser(null);
          setRole(null);
        }

        setFirebaseChecked(true);
      });
    } catch (error) {
      console.warn("onAuthStateChanged failed", error);
      setFirebaseChecked(true);
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    const checkBackendAuth = async () => {
      try {
        const res = await fetchWithTimeout(`${API}/api/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          console.warn("Backend auth check returned non-ok status", res.status);
          return;
        }

        const data = await res.json();

        if (data.success && data.user) {
          setCurrentUser(data.user);
          setRole(data.user.role || "user");
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.warn("Backend auth check timed out after 4 seconds");
        } else {
          console.warn("Backend auth check failed", err);
        }
      } finally {
        setBackendChecked(true);
      }
    };

    checkBackendAuth();
  }, [API]);

  useEffect(() => {
    if (firebaseChecked && backendChecked) {
      setLoading(false);
    }
  }, [firebaseChecked, backendChecked]);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    notify("Welcome back!");
    return credential;
  };

  const signup = async (email, password, profile = {}) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", credential.user.uid), {
      email,
      role: "user",
      ...profile,
      createdAt: serverTimestamp(),
    });

    notify("Welcome!");
    return credential;
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem("cartItems");
    notify("Logged out");
  };

  const checkAuth = async () => {
    try {
      const res = await fetchWithTimeout(`${API}/api/auth/me`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.user) {
        setCurrentUser(data.user);
        setRole(data.user.role || "user");
        return data.user;
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("checkAuth timed out after 4 seconds");
      } else {
        console.warn("checkAuth failed", err);
      }
    }

    return null;
  };

  const value = useMemo(
    () => ({
      currentUser,
      user: currentUser,
      role,
      loading,
      login,
      signup,
      logout,
      checkAuth,
      API,
    }),
    [currentUser, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
