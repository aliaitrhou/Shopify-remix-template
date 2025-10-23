
import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export const action: ActionFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  console.log("Admin API initialized:", admin);

  const formData = await request.formData();
  const productIdsRaw = formData.get("productIds");

  let productIds = [];

  try {
    productIds = productIdsRaw ? JSON.parse(productIdsRaw as string) : [];
  } catch {
    console.error("Invalid JSON in productIds");
  }

  if (!(productIds.length > 0)) {
    return Response.json({ error: "Error: You must select products" }, { status: 400 });
  }

  return Response.json({ message: "Saved metafield and products" });
};
