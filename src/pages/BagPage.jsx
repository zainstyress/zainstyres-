import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const WHATSAPP_NUMBER = "91XXXXXXXXXX";

export default function BagPage() {
  const { cartItems, removeFromCart, updateQty, total } = useCart();

  const checkoutViaWhatsApp = () => {
    const msg =
      `Hi! I want to order:\n\n` +
      cartItems
        .map((i) => `• ${i.name} x${i.qty} = ₹${i.price * i.qty}`)
        .join("\n") +
      `\n\nTotal: ₹${total}\n\nPlease confirm.`;

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (!cartItems.length) {
    return (
      <main className="bag-page bag-page--empty">
        <h1>Your bag is empty</h1>
        <p>Add tyres to your bag and checkout instantly on WhatsApp.</p>
        <Link className="btn btn-primary" to="/shop">
          EXPLORE TYRES
        </Link>
      </main>
    );
  }

  return (
    <main className="bag-page">
      <header className="bag-page__header">
        <h1>Your Bag</h1>
        <Link to="/shop">CONTINUE SHOPPING (INVENTORY)</Link>
      </header>

      <section className="bag-page__layout">
        <div className="bag-page__items">
          {cartItems.map((item) => (
            <article className="bag-item" key={item.id}>
              <Link className="bag-item__image" to={`/product/${item.id}`}>
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <span>{item.name}</span>
                )}
              </Link>

              <div className="bag-item__details">
                <Link to={`/product/${item.id}`}>
                  <h2>{item.name}</h2>
                </Link>
                {item.size && <p>Size: {item.size}</p>}
                <strong>₹{item.price}</strong>
              </div>

              <div className="bag-item__qty" aria-label={`${item.name} quantity`}>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span>{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <strong className="bag-item__line-total">
                ₹{item.price * item.qty}
              </strong>

              <button
                className="bag-item__remove"
                type="button"
                onClick={() => removeFromCart(item.id)}
                aria-label={`Remove ${item.name}`}
              >
                X
              </button>
            </article>
          ))}
        </div>

        <aside className="bag-summary">
          <h2>Cart Summary</h2>
          <div className="bag-summary__row">
            <span>Subtotal</span>
            <strong>₹{total}</strong>
          </div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={checkoutViaWhatsApp}
          >
            CHECKOUT VIA WHATSAPP
          </button>
          <Link className="btn btn-secondary" to="/shop">
            CONTINUE SHOPPING
          </Link>
        </aside>
      </section>
    </main>
  );
}
