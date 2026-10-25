export type Role = "admin" | "cook" | "employee";

export function isStaff(role: Role) {
  return role === "admin" || role === "cook";
}

export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready"
  | "received"
  | "cancelled";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  branchId: string | null;
};

export type Branch = {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  loginEmail?: string | null;
  passwordHash?: string | null;
  hasPassword?: boolean;
};

export type Meal = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  availableQuantity: number;
  orderDeadline: string;
  mealDate: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MealView = Meal & {
  orderedQuantity: number;
};

export type OrderItem = {
  id: string;
  orderId: string;
  mealId: string;
  mealName?: string;
  quantity: number;
  givenQuantity?: number | null;
  unitPrice: number;
  totalPrice: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string | null;
  branchId: string;
  branchName?: string;
  totalAmount: number;
  status: OrderStatus;
  note: string;
  customerLastName: string;
  customerFirstName: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemView = {
  id: string;
  mealId: string;
  mealName: string;
  quantity: number;
  givenQuantity?: number | null;
  unitPrice: number;
  totalPrice: number;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  userId: string | null;
  branchId: string;
  branchName: string;
  totalAmount: number;
  status: OrderStatus;
  note: string;
  customerLastName: string;
  customerFirstName: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemView[];
};

export type BranchStat = {
  branchId: string;
  branchName: string;
  orders: number;
  portions: number;
  revenue: number;
};

export type MonthlyPoint = {
  month: string;
  label: string;
  orders: number;
  givenPortions: number;
  revenue: number;
};

export type DashboardStats = {
  date: string;
  totalOrders: number;
  totalPortions: number;
  givenPortions: number;
  totalRevenue: number;
  activeMeals: number;
  branchSummary: BranchStat[];
  recentOrders: OrderView[];
  monthly: MonthlyPoint[];
};

export type DailyPoint = {
  date: string;
  label: string;
  orders: number;
  revenue: number;
  portions: number;
};

export type MealStat = {
  name: string;
  quantity: number;
  revenue: number;
};

export type ReportData = {
  range: "day" | "week" | "month";
  from: string;
  to: string;
  totalOrders: number;
  totalPortions: number;
  givenPortions: number;
  totalRevenue: number;
  daily: DailyPoint[];
  byBranch: BranchStat[];
  topMeals: MealStat[];
};

export type AppSettings = {
  companyName: string;
  supportPhone: string;
};

export type PermissionGroup = "cook" | "employee";

export type Permission = {
  id: string;
  key: string;
  label: string;
  group: PermissionGroup;
  enabled: boolean;
  builtin: boolean;
};

export type AccountView = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  branchId: string | null;
  branchName: string;
};

export type AccountInput = {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  branchId?: string;
};

export type OrderQuery = {
  date?: string;
  from?: string;
  to?: string;
  branchId?: string;
  status?: OrderStatus | "";
  query?: string;
  userId?: string;
};

export type PlaceOrderInput = {
  mealId: string;
  branchId: string;
  quantity: number;
  lastName: string;
  firstName: string;
  phone: string;
  note?: string;
  userId: string;
};

export type MealInput = {
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  availableQuantity: number;
  orderDeadline: string;
  mealDate: string;
  isActive?: boolean;
};

export type BranchInput = {
  name: string;
  address: string;
  loginEmail?: string;
  isActive?: boolean;
};

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type ProfileRecord = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  branchId: string | null;
  createdAt: string;
};

export type StoreSettings = AppSettings & {
  adminSecret: string;
};

export type StoreData = {
  users: UserRecord[];
  profiles: ProfileRecord[];
  branches: Branch[];
  meals: Meal[];
  orders: Order[];
  orderItems: OrderItem[];
  settings: StoreSettings;
  permissions: Permission[];
};
