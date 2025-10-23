import { useEffect, useState } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import {
  Page,
  Button,
  BlockStack,
  Box,
  TextField,
  Card,
  Banner,
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

type MetafieldResponse =
  | { message: string }
  | { error: string };

export default function Index() {
  const generateProductFetcher = useFetcher<typeof action>();
  const saveCustomFieldFetcher = useFetcher<MetafieldResponse>();

  const [pickedResources, setPickedResources] = useState<any>({});
  const [showBanner, setShowBanner] = useState(true);
  const [value, setValue] = useState("");

  const shopify = useAppBridge();

  const generateProduct = () => generateProductFetcher.submit({}, { method: "POST" });

  const saveCustomField = () => saveCustomFieldFetcher.submit({
    productIds: JSON.stringify(pickedResources),
    customField: value
  }, { method: "POST", action: "/api/metafield" });

  useEffect(() => {
    if (saveCustomFieldFetcher.data) {
      setShowBanner(true);
    }
  }, [saveCustomFieldFetcher.data]);

  async function openResourcePicker() {
    const selectedProducts = await shopify.resourcePicker({ type: 'product' });

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
        <BlockStack gap="600">

          {saveCustomFieldFetcher.data?.error && showBanner && (
            <Banner tone="critical" title="" onDismiss={() => setShowBanner(false)}>
              <p>{saveCustomFieldFetcher.data.error}</p>
            </Banner>
          )}

          {saveCustomFieldFetcher.data?.message && showBanner && (
            <Banner tone="success" title="" onDismiss={() => setShowBanner(false)}>
              <p>{saveCustomFieldFetcher.data.message}</p>
            </Banner>
          )}
          <Box maxWidth="200px">
            <Button onClick={openResourcePicker}>
              Select Products
            </Button>
          </Box>

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


          <BlockStack gap="300">
            <TextField
              maxLength={20}
              label="Enter Custom value"
              placeholder="Custom Value"
              value={value}
              onChange={handleChange}
              autoComplete="off"
              max={20}
            />

            <Box maxWidth="50px">
              <Button variant="primary" onClick={saveCustomField} loading={saveCustomFieldFetcher.state == 'submitting'}>Save</Button>
            </Box>
          </BlockStack>
        </BlockStack>
      </Card>
    </Page>
  );
}
