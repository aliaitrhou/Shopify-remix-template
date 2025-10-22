import { useState } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import {
  Page,
  Button,
  BlockStack,
  Box,
  TextField,
  Card,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useFetcher } from "@remix-run/react";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();
  const [pickedResources, setPickedResources] = useState<any>({});
  const [value, setValue] = useState("test");

  const shopify = useAppBridge();

  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  const saveCustomField = () => fetcher.submit({
    id: value,
  }, { method: "POST" });

  async function openResourcePicker() {
    const selectedProducts = await shopify.resourcePicker({ type: 'product', multiple: true });

    const productIds = selectedProducts?.map((p) => p.id);
    console.log('Selected product IDs:', productIds);

    setPickedResources(productIds);

  }

  const handleChange = (newValue: string) => {
    setValue(newValue);
  }

  return (
    <Page>
      <TitleBar title="Remix app template">
        <button variant="primary" onClick={generateProduct}>
          Generate a product
        </button>
      </TitleBar>
      <Card>

        <BlockStack gap="500">
          <Box maxWidth="200px">
            <Button onClick={openResourcePicker}>
              Select Products
            </Button>
          </Box>
          <BlockStack gap="200">
            <TextField
              maxLength={20}
              label="Enter Custom value"
              value={value}
              onChange={handleChange}
              autoComplete="off"
              max={20}
            />
            <Box maxWidth="50px">
              <Button variant="primary" onClick={saveCustomField} loading={fetcher.state == 'submitting'}>Save</Button>
            </Box>
          </BlockStack>
          {
            pickedResources && (
              <Box
                minHeight="400"
                padding="400"
                background="bg-surface-active"
                borderWidth="025"
                borderRadius="200"
                borderColor="border"
                overflowX="scroll"
              >
                <pre style={{ margin: 0 }}>
                  <code>
                    {JSON.stringify(pickedResources, null, 2)}
                  </code>
                </pre>
              </Box>
            )
          }
        </BlockStack>
      </Card>
    </Page>
  );
}
