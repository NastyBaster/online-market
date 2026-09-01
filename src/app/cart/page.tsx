import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, getCatalog } from "@/modules/catalog";
import { getAvailabilityLabel, getCartStatusMessage, resolveCart, CART_COOKIE_NAME } from "@/modules/cart";
import { getStoreConfig } from "@/modules/store-config";
import { decodeCartCookie } from "@/providers/cart";

type CartPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function CartPage({ searchParams }: CartPageProps) {
  const [params, cookieStore, storeResult, catalogResult] = await Promise.all([
    searchParams,
    cookies(),
    getStoreConfig(),
    getCatalog(),
  ]);
  const cart = resolveCart(
    decodeCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value),
    catalogResult.catalog,
  );
  const statusMessage = getCartStatusMessage(firstParam(params.cartStatus));
  const { currency, locale } = storeResult.config;

  return (
    <main className="main" id="main-content" tabIndex={-1}>
      <section className="cart-page" aria-labelledby="cart-title">
        <div className="cart-header">
          <div>
            <div className="eyebrow">{storeResult.config.identity.shortName}</div>
            <h1 id="cart-title">Cart</h1>
            <p className="cart-copy">
              Server-side pricing, inventory, and subtotal are recalculated from the demo catalog on every request.
            </p>
          </div>
          <Link className="back-link" href="/#catalog">
            Continue shopping
          </Link>
        </div>
        {statusMessage ? (
          <p className="cart-status-banner" role="status">
            {statusMessage}
          </p>
        ) : null}
        {cart.isEmpty ? (
          <section className="cart-empty" aria-labelledby="cart-empty-title">
            <h2 id="cart-empty-title">Your cart is empty</h2>
            <p>Add an available demo product to see the cart summary here.</p>
            <Link className="back-link" href="/#catalog">
              Browse catalog
            </Link>
          </section>
        ) : (
          <div className="cart-layout">
            <ul className="cart-list" aria-label="Cart items">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="cart-line">
                  <div className="cart-line-media">
                    <div className="cart-line-image-frame">
                      <Image
                        className="cart-line-image"
                        src={line.productImage.src}
                        alt={line.productImage.alt}
                        width={480}
                        height={360}
                        sizes="(min-width: 1040px) 10rem, 35vw"
                      />
                    </div>
                  </div>
                  <div className="cart-line-body">
                    <div className="cart-line-copy">
                      <p className="cart-line-category">{getAvailabilityLabel(line.availability)}</p>
                      <h2>
                        <Link href={`/products/${line.productSlug}`}>{line.productName}</Link>
                      </h2>
                      <dl className="cart-line-facts">
                        <div>
                          <dt>Variant</dt>
                          <dd>{line.variantLabel}</dd>
                        </div>
                        <div>
                          <dt>SKU</dt>
                          <dd>{line.sku}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="cart-line-pricing">
                      <p>
                        <span>Unit price</span>
                        <strong>{formatPrice(line.unitPriceMinor, currency, locale)}</strong>
                      </p>
                      <p>
                        <span>Line total</span>
                        <strong>{formatPrice(line.lineTotalMinor, currency, locale)}</strong>
                      </p>
                    </div>
                    <div className="cart-line-actions">
                      <div className="cart-stepper" aria-label={`${line.productName} quantity controls`}>
                        <form action="/cart/update" method="post">
                          <input type="hidden" name="variantId" value={line.variantId} />
                          <input type="hidden" name="redirectTo" value="/cart" />
                          <input
                            type="hidden"
                            name="quantity"
                            value={Math.max(1, line.quantity - 1)}
                          />
                          <button
                            className="cart-action-button"
                            type="submit"
                            aria-label={`Decrease ${line.productName} quantity`}
                            disabled={line.quantity <= 1}
                          >
                            -
                          </button>
                        </form>
                        <form action="/cart/update" className="cart-quantity-form" method="post">
                          <input type="hidden" name="variantId" value={line.variantId} />
                          <input type="hidden" name="redirectTo" value="/cart" />
                          <label className="cart-quantity-label" htmlFor={`quantity-${line.variantId}`}>
                            Quantity
                          </label>
                          <input
                            className="cart-quantity-input"
                            id={`quantity-${line.variantId}`}
                            name="quantity"
                            type="number"
                            min={1}
                            max={line.maxQuantity}
                            defaultValue={line.quantity}
                            inputMode="numeric"
                          />
                          <button className="cart-secondary-button" type="submit">
                            Update
                          </button>
                        </form>
                        <form action="/cart/update" method="post">
                          <input type="hidden" name="variantId" value={line.variantId} />
                          <input type="hidden" name="redirectTo" value="/cart" />
                          <input
                            type="hidden"
                            name="quantity"
                            value={Math.min(line.maxQuantity, line.quantity + 1)}
                          />
                          <button
                            className="cart-action-button"
                            type="submit"
                            aria-label={`Increase ${line.productName} quantity`}
                            disabled={line.quantity >= line.maxQuantity}
                          >
                            +
                          </button>
                        </form>
                      </div>
                      <form action="/cart/remove" method="post">
                        <input type="hidden" name="variantId" value={line.variantId} />
                        <input type="hidden" name="redirectTo" value="/cart" />
                        <button className="cart-secondary-button" type="submit">
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="cart-summary" aria-labelledby="cart-summary-title">
              <h2 id="cart-summary-title">Summary</h2>
              <dl>
                <div>
                  <dt>Items</dt>
                  <dd>{cart.itemCount}</dd>
                </div>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(cart.subtotalMinor, currency, locale)}</dd>
                </div>
              </dl>
              <p className="cart-summary-note">
                Demo cart only. Checkout, shipping, and order creation stay out of scope for this issue.
              </p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
