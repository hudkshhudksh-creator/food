import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { cookAllowed } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorMessage } from "@/lib/errors";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "meal-images";

function contentTypeOf(file: File) {
  if (ALLOWED.has(file.type)) return file.type === "image/jpg" ? "image/jpeg" : file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function extensionOf(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function saveToBlob(bytes: Buffer, filename: string, contentType: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const { put } = await import("@vercel/blob");
  const blob = await put(`meals/${filename}`, bytes, {
    access: "public",
    token,
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}

async function saveToSupabase(bytes: Buffer, filename: string, contentType: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (!bucket) {
    const { error: createError } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (createError && !/exists|duplicate/i.test(createError.message)) throw createError;
  }
  const objectPath = `meals/${filename}`;
  const { error } = await admin.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function saveToDisk(bytes: Buffer, filename: string) {
  if (process.env.VERCEL) return null;
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);
  return `/uploads/${filename}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "cook")) {
    return Response.json({ message: "Зураг байршуулах эрхгүй байна." }, { status: 401 });
  }
  if (user.role === "cook" && !(await cookAllowed("meals"))) {
    return Response.json({ message: "Зураг байршуулах эрхгүй байна." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ message: "Зургийн файл сонгоно уу." }, { status: 400 });
  }
  const contentType = contentTypeOf(file);
  if (!contentType) {
    return Response.json({ message: "Зөвхөн JPG, JPEG, PNG, WEBP зураг оруулна уу." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ message: "Зургийн хэмжээ 5MB-аас бага байх ёстой." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${crypto.randomUUID()}.${extensionOf(contentType)}`;

    for (const save of [
      () => saveToBlob(bytes, filename, contentType),
      () => saveToSupabase(bytes, filename, contentType),
      () => saveToDisk(bytes, filename),
    ]) {
      try {
        const url = await save();
        if (url) return Response.json({ url });
      } catch {
        // Try the next storage option.
      }
    }

    return Response.json({
      url: `data:${contentType};base64,${bytes.toString("base64")}`,
    });
  } catch (error) {
    return Response.json({ message: errorMessage(error, "Зураг байршуулахад алдаа гарлаа. Дахин оролдоно уу.") }, { status: 500 });
  }
}
