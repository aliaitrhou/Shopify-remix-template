import type { ActionFunction } from "@remix-run/node";
import prisma from "app/db.server";
import { authenticate } from "app/shopify.server";

export const action: ActionFunction = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  console.log("Admin API initialized:", admin);

  const formData = await request.formData();
  const productIdsRaw = formData.get("productIds");
  const customValue = formData.get("customField") as string;


  const productIds = JSON.parse(productIdsRaw as string);


  if (productIds.length === 0) {
    return Response.json({ error: "You must select products" }, { status: 400 });
  }

  if (!customValue) {
    return Response.json({ error: "Custom field is required" }, { status: 400 });
  }

  console.log("Received form data:", { productIds, customValue });

  const mutation = `
  mutation CreateProductMetafield($input: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $input) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

  for (const productId of productIds) {
    const response = await admin.graphql(mutation, {
      variables: {
        input: [{
          ownerId: `${productId}`,
          namespace: "custom",
          key: "my_custom_field",
          type: "single_line_text_field",
          value: customValue
        }]
      }
    });

    const result = await response.json();
    console.log("Metafield created:", result);

    if (result.data.metafieldsSet.userErrors.length == 0) {
      try {
        // save to database
        await prisma.metafieldLog.create({
          data: {
            productId: productId,
            customValue,
            shop: session.shop,
          },
        });

      } catch (erro) {
        console.error("Error saving to database:", erro);
      }
    }
  }


  return Response.json({ message: "Saved metafield and products" });
};



