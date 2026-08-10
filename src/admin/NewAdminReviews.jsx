import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { matchesSearch, notify, toDate } from "./adminUtils";

export default function NewAdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("all");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reviews"), (snap) => {
      setReviews(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => reviews.filter((review) => {
    const ratingOk = rating === "all" || Number(review.rating) === Number(rating);
    return ratingOk && matchesSearch(review, query, ["tyreName", "review", "userName"]);
  }), [reviews, query, rating]);

  const remove = async (review) => {
    if (!window.confirm("Delete this review?")) return;
    await deleteDoc(doc(db, "reviews", review.id));
    if (review.tyreId) {
      const remaining = await getDocs(query(collection(db, "reviews"), where("tyreId", "==", review.tyreId)));
      const ratings = remaining.docs.map((item) => Number(item.data().rating) || 0);
      const totalReviews = ratings.length;
      const averageRating = totalReviews ? ratings.reduce((sum, value) => sum + value, 0) / totalReviews : 0;
      await updateDoc(doc(db, "tyres", review.tyreId), { averageRating, totalReviews });
    }
    notify("Review deleted");
  };

  return (
    <section>
      <h1>Reviews</h1>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by tyre or review" />
      <select value={rating} onChange={(e) => setRating(e.target.value)}><option value="all">All ratings</option><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select>
      <table className="za-table">
        <thead><tr><th>Tyre</th><th>User</th><th>Rating</th><th>Review</th><th>Date</th><th>Verified</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map((review) => (
            <tr key={review.id}>
              <td>{review.tyreName}</td><td>{review.userName}</td><td>{review.rating}</td><td>{review.review}</td><td>{toDate(review.createdAt)?.toLocaleDateString("en-IN")}</td>
              <td><input checked={!!review.verifiedPurchase} type="checkbox" onChange={(e) => updateDoc(doc(db, "reviews", review.id), { verifiedPurchase: e.target.checked })} /></td>
              <td><button onClick={() => remove(review)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
