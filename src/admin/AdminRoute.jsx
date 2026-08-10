import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

export default function AdminRoute({ children }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    role: null,
  });

  useEffect(() => {
    let unsubUser = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (!user) {
        setState({ loading: false, user: null, role: null });
        return;
      }

      unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
        setState({
          loading: false,
          user,
          role: snap.exists() ? snap.data().role : "user",
        });
      });
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  if (state.loading) {
    return <div className="za-admin-loading">Loading admin...</div>;
  }

  if (!state.user) {
    return <Navigate replace to="/login" />;
  }

  if (state.role !== "admin") {
    return <Navigate replace to="/" />;
  }

  return children;
}
