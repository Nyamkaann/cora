import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolveStoragePath } from "@/lib/images/storage";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");
  const ext = relativePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];

  if (!contentType) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }

  let absolutePath: string;
  try {
    absolutePath = resolveStoragePath(relativePath);
  } catch {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(absolutePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
