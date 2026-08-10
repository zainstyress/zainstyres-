import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <h1>404 - Page not found</h1>
      <Link className="btn btn-primary" to="/">
        GO HOME
      </Link>
    </main>
  );
}
