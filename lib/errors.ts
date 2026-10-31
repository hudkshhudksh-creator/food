const MESSAGES: Record<string, string> = {
  MEAL_NOT_FOUND: "Хоол олдсонгүй.",
  MEAL_INACTIVE: "Энэ хоол одоогоор идэвхгүй байна.",
  DEADLINE_PASSED: "Өмнөх өдрийн хоол захиалах боломжгүй.",
  INSUFFICIENT_QUANTITY: "Үлдэгдэл хүрэлцэхгүй байна.",
  BRANCH_INACTIVE: "Салбар идэвхгүй байна.",
  UNAUTHORIZED: "Нэвтрэх шаардлагатай.",
  FORBIDDEN: "Энэ үйлдлийг хийх эрхгүй байна.",
  ORDER_NOT_FOUND: "Захиалга олдсонгүй.",
  MEAL_HAS_ORDERS: "Энэ хоолтой холбоотой захиалга байгаа тул устгах боломжгүй. Идэвхгүй болгоно уу.",
  INVALID_STATUS: "Статус буруу байна.",
  INVALID_GIVEN_QTY: "Өгсөн тоо захиалсан тооноос хэтэрч болохгүй.",
  BRANCH_HAS_ORDERS: "Энэ салбартай холбоотой захиалга байгаа тул устгах боломжгүй.",
  BRANCH_PASSWORD: "Салбарын нууц үг буруу байна.",
  BRANCH_NO_PASSWORD: "Энэ салбарт нууц үг тохируулаагүй байна.",
  UPLOAD_FAILED: "Зураг байршуулахад алдаа гарлаа. Дахин оролдоно уу.",
  INVALID_IMAGE: "Зөвхөн JPG, JPEG, PNG, WEBP зураг оруулна уу.",
  IMAGE_TOO_LARGE: "Зургийн хэмжээ 5MB-аас бага байх ёстой.",
  LAST_ADMIN: "Ганц админы эрхийг хасах боломжгүй.",
  PRIMARY_ADMIN: "Зөвхөн үндсэн админ бусад админ эрх нэмж, хасна.",
  PRIMARY_PROTECTED: "Үндсэн админы эрхийг хасах боломжгүй.",
  PRIMARY_PASSWORD: "Үндсэн админы нууц үгийг солих боломжгүй.",
  EMAIL_TAKEN: "Энэ имэйл бүртгэлтэй байна.",
  ACCOUNT_NOT_FOUND: "Бүртгэл олдсонгүй. Хуудсыг шинэчлээд дахин оролдоно уу.",
  STORE_UNAVAILABLE: "Бүртгэл хадгалагдахгүй байна. Vercel төсөл дээрх мэдээллийн санг холбоно уу.",
  INVALID_SECRET: "Нууц хаяг 8-40 тэмдэгт, жижиг үсэг, тоо, зураас ашиглана.",
};

export class AppError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? MESSAGES[code] ?? code);
    this.code = code;
    this.name = "AppError";
  }
}

export function errorMessage(error: unknown, fallback = "Алдаа гарлаа. Дахин оролдоно уу.") {
  if (error instanceof AppError) return MESSAGES[error.code] ?? error.message;
  if (error instanceof Error) {
    for (const [code, message] of Object.entries(MESSAGES)) {
      if (error.message.includes(code)) return message;
    }
  }
  return fallback;
}
