import { DEMO_ACCOUNTS } from "@/lib/constants";
import { hashPassword } from "@/lib/auth/password";
import { todayInUlaanbaatar } from "@/lib/format";
import { DEFAULT_ADMIN_SECRET } from "@/lib/panel-path";
import { defaultPermissions } from "@/lib/permissions";
import type { StoreData } from "@/types";

const IDS = {
  admin: "11111111-1111-4111-8111-111111111111",
  employee: "22222222-2222-4222-8222-222222222222",
  adminProfile: "11111111-1111-4111-8111-111111111112",
  employeeProfile: "22222222-2222-4222-8222-222222222223",
  tuv: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  bzd: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  hud: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  sbd: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  shh: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
  mealToday: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
};

export function buildSeed(): StoreData {
  const today = todayInUlaanbaatar();
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: IDS.admin,
        email: DEMO_ACCOUNTS[0].email,
        passwordHash: hashPassword(DEMO_ACCOUNTS[0].password),
        createdAt: now,
      },
      {
        id: IDS.employee,
        email: DEMO_ACCOUNTS[1].email,
        passwordHash: hashPassword(DEMO_ACCOUNTS[1].password),
        createdAt: now,
      },
    ],
    profiles: [
      {
        id: IDS.adminProfile,
        userId: IDS.admin,
        firstName: "Сарантуяа",
        lastName: "Бат",
        phone: "88110022",
        role: "admin",
        branchId: null,
        createdAt: now,
      },
      {
        id: IDS.employeeProfile,
        userId: IDS.employee,
        firstName: "Батбаяр",
        lastName: "Дорж",
        phone: "99112233",
        role: "employee",
        branchId: IDS.tuv,
        createdAt: now,
      },
    ],
    branches: [
      { id: IDS.tuv, name: "Төв салбар", address: "Сүхбаатарын талбай, 1-р хороо", isActive: true, createdAt: now },
      { id: IDS.bzd, name: "Баянзүрх салбар", address: "13-р хороолол", isActive: true, createdAt: now },
      { id: IDS.hud, name: "Хан-Уул салбар", address: "Зайсан", isActive: true, createdAt: now },
      { id: IDS.sbd, name: "Сүхбаатар салбар", address: "Бага тойруу", isActive: true, createdAt: now },
      { id: IDS.shh, name: "Сонгинохайрхан салбар", address: "21-р хороолол", isActive: true, createdAt: now },
    ],
    meals: [
      {
        id: IDS.mealToday,
        name: "Бууз + салат",
        description: "10 ширхэг гар хийцийн бууз, шинэ ногооны салат",
        imageUrl: "/meals/buuz.svg",
        price: 15000,
        availableQuantity: 100,
        orderDeadline: "20:00",
        mealDate: today,
        isActive: true,
        createdBy: IDS.admin,
        createdAt: now,
        updatedAt: now,
      },
    ],
    orders: [],
    orderItems: [],
    settings: {
      companyName: "ӨДРИЙН ХООЛ",
      supportPhone: "88110022",
      adminSecret: DEFAULT_ADMIN_SECRET,
    },
    permissions: defaultPermissions(),
  };
}
