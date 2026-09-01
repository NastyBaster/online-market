import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCatalogVariantById } from "@/modules/catalog";
import {
  addVariantToCart,
  appendCartStatus,
  assertCartWritable,
  assertVariantCanBeAdded,
  buildRedirectUrl,
  CART_COOKIE_NAME,
  CartMutationError,
  parseCartVariantId,
  sanitizeRedirectPath,
} from "@/modules/cart";
import { createSetCartCookie, decodeCartCookie, isCartWritable } from "@/providers/cart";

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectPath = sanitizeRedirectPath(formData.get("redirectTo"), "/cart");

  try {
    assertCartWritable(isCartWritable());

    const variantId = parseCartVariantId(formData.get("variantId"));
    const record = assertVariantCanBeAdded(await getCatalogVariantById(variantId));
    const cookieStore = await cookies();
    const nextItems = addVariantToCart(
      decodeCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value),
      record,
    );
    const response = NextResponse.redirect(
      buildRedirectUrl(appendCartStatus(redirectPath, "added"), request),
      { status: 303 },
    );

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
