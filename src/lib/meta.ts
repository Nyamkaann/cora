import "server-only";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MetaConfig = {
  pageAccessToken: string;
  pageId: string;
  igBusinessId: string;
};

export function getMetaConfig(): MetaConfig | null {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const igBusinessId = process.env.META_IG_BUSINESS_ID;

  if (!pageAccessToken || !pageId || !igBusinessId) {
    return null;
  }

  return { pageAccessToken, pageId, igBusinessId };
}

class MetaApiError extends Error {}

async function parseGraphResponse(response: Response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? `Meta API request failed with status ${response.status}`;
    throw new MetaApiError(message);
  }

  return body;
}

export async function postPhotoToFacebookPage(
  config: MetaConfig,
  imageBuffer: Buffer,
  caption: string
): Promise<string> {
  const formData = new FormData();
  formData.append("caption", caption);
  formData.append("access_token", config.pageAccessToken);
  formData.append("source", new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }), "product.png");

  const response = await fetch(`${GRAPH_API_BASE}/${config.pageId}/photos`, {
    method: "POST",
    body: formData,
  });

  const body = await parseGraphResponse(response);
  return body.post_id ?? body.id;
}

export async function postImageToInstagram(
  config: MetaConfig,
  publicImageUrl: string,
  caption: string
): Promise<string> {
  const createContainer = await fetch(`${GRAPH_API_BASE}/${config.igBusinessId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: publicImageUrl,
      caption,
      access_token: config.pageAccessToken,
    }),
  });
  const containerBody = await parseGraphResponse(createContainer);
  const creationId = containerBody.id;

  const publish = await fetch(`${GRAPH_API_BASE}/${config.igBusinessId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: config.pageAccessToken,
    }),
  });
  const publishBody = await parseGraphResponse(publish);
  return publishBody.id;
}
