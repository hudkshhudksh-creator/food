import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { cookAllowed } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isSupabaseConfigured } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "cook") || !(await cookAllowed("meals"))) {
    return Response.json({ message: "Зураг байршуулах эрхгүй байна." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ message: "Зургийн файл сонгоно уу." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json({ message: "Зөвхөн JPG, JPEG, PNG, WEBP зураг оруулна уу." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ message: "Зургийн хэмжээ 5MB-аас бага байх ёстой." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const objectPath = `${user.id}/${filename}`;
      const { error } = await supabase.storage.from("meal-images").upload(objectPath, bytes, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        return Response.json({ message: "Зураг байршуулахад алдаа гарлаа. Дахин оролдоно уу." }, { status: 500 });
      }
      const { data } = supabase.storage.from("meal-images").getPublicUrl(objectPath);
      return Response.json({ url: data.publicUrl });
    }

    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes);
    return Response.json({ url: `/uploads/${filename}` });
  } catch (error) {
    return Response.json({ message: errorMessage(error, "Зураг байршуулахад алдаа гарлаа. Дахин оролдоно уу.") }, { status: 500 });
  }
}
