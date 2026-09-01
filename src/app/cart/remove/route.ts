import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  appendCartStatus,
  assertCartWritable,
  buildRedirectUrl,
  CART_COOKIE_NAME,
  CartMutationError,
  parseCartVariantId,
  removeVariantFromCart,
  sanitizeRedirectPath,
} from "@/modules/cart";
import {
  createClearedCartCookie,
  createSetCartCookie,
  decodeCartCookie,
  isCartWritable,
} from "@/providers/cart";

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectPath = sanitizeRedirectPath(formData.get("redirectTo"), "/cart");

  try {
    assertCartWritable(isCartWritable());

    const variantId = parseCartVariantId(formData.get("variantId"));
    const cookieStore = await cookies();
    const nextItems = removeVariantFromCart(
      decodeCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value),
      variantId,
    );
    const response = NextResponse.redirect(
      buildRedirectUrl(appendCartStatus(redirectPath, "removed"), request),
      { status: 303 },
    );

    if (nextItems.length === 0) {
      response.cookies.set(createClearedCartCookie());
      return response;
    }

    response.cookies.set(createSetCartCookie(nextItems));
    return response;
  } catch (error) {
    const status = error instanceof CartMutationError ? error.status : "cart-unavailable";

    return NextResponse.redirect(
      buildRedirectUrl(appendCartStatus(redirectPath, status), request),
      { status: 303 },
    );
  }
}
