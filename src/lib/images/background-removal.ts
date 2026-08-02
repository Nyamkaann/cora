import "server-only";
import { removeBackground } from "@imgly/background-removal-node";

/**
 * Runs entirely locally via bundled ONNX models (no external API, no per-image
 * cost, no network dependency) — see the model files shipped inside
 * node_modules/@imgly/background-removal-node/dist. Swap this function's body
 * for a remove.bg/Photoroom API call if quality ever needs to improve.
 */
export async function removeImageBackground(input: Buffer, mimeType: string): Promise<Buffer> {
  const blob = new Blob([new Uint8Array(input)], { type: mimeType });
  const result = await removeBackground(blob);
  return Buffer.from(await result.arrayBuffer());
}
