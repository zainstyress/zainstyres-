import { Link } from "react-router-dom";

const articles = [
  {
    title: "When to change tyres",
    body: "Replace tyres when tread depth is low, sidewalls show cracks or bulges, braking distance increases, or the tyre is older than the manufacturer's safe service window.",
  },
  {
    title: "Tyre maintenance tips",
    body: "Check pressure monthly, rotate tyres on schedule, keep wheels aligned, inspect for uneven wear, and avoid overloading the vehicle.",
  },
  {
    title: "Tyre size guide",
    body: "Match the width, aspect ratio, rim diameter, load rating, and speed rating recommended for your vehicle before upgrading.",
  },
];

export default function HubPage() {
  const message = encodeURIComponent("Hi! I have a tyre query. Please help.");

  return (
    <main className="hub-page">
      <header className="hub-page__header">
        <h1>Maintenance Guide</h1>
        <a
          className="btn btn-primary"
          href={`https://wa.me/91XXXXXXXXXX?text=${message}`}
          rel="noreferrer"
          target="_blank"
        >
          ASK ON WHATSAPP
        </a>
      </header>

      <section className="hub-page__articles">
        {articles.map((article) => (
          <article className="hub-article" key={article.title}>
            <h2>{article.title}</h2>
            <p>{article.body}</p>
            <Link to="/shop">EXPLORE INVENTORY</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
