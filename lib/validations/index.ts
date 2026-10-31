import { z } from "zod";
import { isMnPhone, normalizePhone } from "@/lib/format";

export const loginSchema = z.object({
  email: z.string().trim().email("Имэйл хаяг буруу байна."),
  password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байна."),
});

export const orderSchema = z.object({
  mealId: z.string().uuid("Хоол сонгогдоогүй байна."),
  lastName: z.string().trim().min(1, "Овог оруулна уу.").max(80, "Овог хэт урт байна."),
  firstName: z.string().trim().min(1, "Нэр оруулна уу.").max(80, "Нэр хэт урт байна."),
  branchId: z.string().uuid("Салбар сонгоно уу."),
  phone: z
    .string()
    .trim()
    .min(1, "Утасны дугаар оруулна уу.")
    .refine(isMnPhone, "Утасны дугаар буруу байна. 8 оронтой дугаар оруулна уу."),
  quantity: z.coerce
    .number({ invalid_type_error: "Тоо ширхэг оруулна уу." })
    .int("Тоо ширхэг бүхэл тоо байна.")
    .min(1, "Тоо ширхэг хамгийн багадаа 1 байна."),
  note: z.string().trim().max(300, "Тайлбар 300 тэмдэгтээс хэтрэхгүй.").optional().or(z.literal("")),
});

export const mealSchema = z.object({
  name: z.string().trim().min(1, "Хоолны нэр оруулна уу.").max(120, "Нэр хэт урт байна."),
  description: z.string().trim().max(500, "Тайлбар 500 тэмдэгтээс хэтрэхгүй.").optional().or(z.literal("")),
  imageUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .refine(
      (value) =>
        !value ||
        value.startsWith("/") ||
        value.startsWith("data:image/") ||
        /^https?:\/\//.test(value),
      {
        message: "Зургийн холбоос буруу байна.",
      },
    ),
  price: z.coerce
    .number({ invalid_type_error: "Үнэ оруулна уу." })
    .int("Үнэ бүхэл тоо байна.")
    .min(1, "Үнэ оруулна уу.")
    .max(5_000_000, "Үнэ хэт өндөр байна."),
  availableQuantity: z.coerce
    .number({ invalid_type_error: "Боломжит порц оруулна уу." })
    .int("Порц бүхэл тоо байна.")
    .min(0, "Порц 0-ээс бага байж болохгүй.")
    .max(10000, "Порц хэт их байна."),
  mealDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо оруулна уу."),
  isActive: z.boolean().optional(),
});

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Салбарын нэр оруулна уу.").max(80),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  loginEmail: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || z.string().email().safeParse(value).success, "Нэвтрэх имэйл буруу байна."),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || value.length >= 6, "Нууц үг хамгийн багадаа 6 тэмдэгт байна."),
});

export const branchPasswordSchema = z.object({
  branchId: z.string().uuid("Салбар сонгоно уу."),
  password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байна."),
});

export const branchLoginSchema = z.object({
  branchId: z.string().uuid("Салбар сонгоно уу."),
  password: z.string().min(1, "Нууц үг оруулна уу."),
});

export const profileSchema = z.object({
  lastName: z.string().trim().min(1, "Овог оруулна уу.").max(80),
  firstName: z.string().trim().min(1, "Нэр оруулна уу.").max(80),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || isMnPhone(value), "Утасны дугаар буруу байна."),
});

export const accountSchema = z.object({
  lastName: z.string().trim().min(1, "Овог оруулна уу.").max(80),
  firstName: z.string().trim().min(1, "Нэр оруулна уу.").max(80),
  email: z.string().trim().email("Имэйл хаяг буруу байна."),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || isMnPhone(value), "Утасны дугаар буруу байна."),
  password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байна."),
  role: z.enum(["admin", "cook", "employee"]),
  branchId: z.string().trim().optional().or(z.literal("")),
});

export const accountPasswordSchema = z.object({
  userId: z.string().uuid("Бүртгэл олдсонгүй."),
  password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байна."),
});

export const permissionLabelSchema = z.object({
  label: z.string().trim().min(1, "Эрхийн нэр оруулна уу.").max(80),
  group: z.enum(["cook", "employee"]),
});

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1, "Байгууллагын нэр оруулна уу.").max(80),
  supportPhone: z
    .string()
    .trim()
    .refine((value) => value === "" || isMnPhone(value), "Утасны дугаар буруу байна."),
});

export const creditSchema = z.object({
  lastName: z.string().trim().min(1, "Овог оруулна уу.").max(80),
  firstName: z.string().trim().min(1, "Нэр оруулна уу.").max(80),
  branchId: z.string().uuid("Салбар сонгоно уу."),
  takenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо оруулна уу."),
  amount: z.coerce.number({ invalid_type_error: "Зээлийн хэмжээ оруулна уу." }).int().min(1, "Зээлийн хэмжээ оруулна уу.").max(50_000_000),
});

export const dailyAdjustmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо оруулна уу."),
  totalOrders: z.coerce.number().int().min(0).max(100000),
  totalPortions: z.coerce.number().int().min(0).max(1000000),
  givenPortions: z.coerce.number().int().min(0).max(1000000),
  totalRevenue: z.coerce.number().int().min(0).max(100_000_000),
  activeMeals: z.coerce.number().int().min(0).max(10000),
});

export const fulfillOrderSchema = z.object({
  orderId: z.string().uuid("Захиалга олдсонгүй."),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid("Хоол олдсонгүй."),
        quantity: z.coerce.number().int().min(0, "Өгсөн тоо 0-ээс бага байж болохгүй."),
      }),
    )
    .min(1, "Өгсөн тоо оруулна уу."),
});

export function normalizedOrder(input: z.infer<typeof orderSchema>) {
  return {
    ...input,
    phone: normalizePhone(input.phone),
    note: input.note?.trim() ?? "",
  };
}

export type LoginInput = z.infer<typeof loginSchema>;
export type OrderFormInput = z.infer<typeof orderSchema>;
export type MealFormInput = z.infer<typeof mealSchema>;
export type BranchFormInput = z.infer<typeof branchSchema>;
export type ProfileFormInput = z.infer<typeof profileSchema>;
export type SettingsFormInput = z.infer<typeof settingsSchema>;
