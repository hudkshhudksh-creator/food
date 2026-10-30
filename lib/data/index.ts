import * as local from "@/lib/data/local";
import * as remote from "@/lib/data/supabase-repo";
import type { AccountInput, BranchInput, CreditInput, DailyAdjustment, MealInput, OrderQuery, OrderStatus, PermissionGroup, PlaceOrderInput, Role } from "@/types";

function remoteMode() {
  // Account, meal, and order data live in the JSON store so admin can add
  // and remove users. Supabase is used as a cloud copy of that store.
  return false;
}

export async function getBranches(includeInactive = false) {
  if (remoteMode()) {
    try {
      return await remote.getBranches(includeInactive);
    } catch {
      return local.getBranches(includeInactive);
    }
  }
  return local.getBranches(includeInactive);
}

export async function saveBranch(input: BranchInput, id?: string) {
  return remoteMode() ? remote.saveBranch(input, id) : local.saveBranch(input, id);
}

export async function setBranchActive(id: string, isActive: boolean) {
  return remoteMode() ? remote.setBranchActive(id, isActive) : local.setBranchActive(id, isActive);
}

export async function deleteBranch(id: string) {
  return remoteMode() ? remote.deleteBranch(id) : local.deleteBranch(id);
}

export async function setBranchPassword(id: string, password: string) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.setBranchPassword(id, password);
}

export async function clearBranchPassword(id: string) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.clearBranchPassword(id);
}

export async function getMeals() {
  return remoteMode() ? remote.getMeals() : local.getMeals();
}

export async function getTodayMeals() {
  return remoteMode() ? remote.getTodayMeals() : local.getTodayMeals();
}

export async function getMeal(id: string) {
  return remoteMode() ? remote.getMeal(id) : local.getMeal(id);
}

export async function saveMeal(input: MealInput, userId: string, id?: string) {
  return remoteMode() ? remote.saveMeal(input, userId, id) : local.saveMeal(input, userId, id);
}

export async function setMealActive(id: string, isActive: boolean) {
  return remoteMode() ? remote.setMealActive(id, isActive) : local.setMealActive(id, isActive);
}

export async function deleteMeal(id: string) {
  return remoteMode() ? remote.deleteMeal(id) : local.deleteMeal(id);
}

export async function getOrders(query: OrderQuery = {}) {
  return remoteMode() ? remote.getOrders(query) : local.getOrders(query);
}

export async function getOrderByNumber(orderNumber: string) {
  return remoteMode() ? remote.getOrderByNumber(orderNumber) : local.getOrderByNumber(orderNumber);
}

export async function placeOrder(input: PlaceOrderInput) {
  return remoteMode() ? remote.placeOrder(input) : local.placeOrder(input);
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  return remoteMode() ? remote.setOrderStatus(orderId, status) : local.setOrderStatus(orderId, status);
}

export async function fulfillOrder(orderId: string, given: { itemId: string; quantity: number }[]) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.fulfillOrder(orderId, given);
}

export async function getDashboard(date?: string) {
  return remoteMode() ? remote.getDashboard(date) : local.getDashboard(date);
}

export async function listCredits() {
  return local.listCredits();
}

export async function addCredit(input: CreditInput) {
  return local.addCredit(input);
}

export async function deleteCredit(id: string) {
  return local.deleteCredit(id);
}

export async function saveDailyAdjustment(input: DailyAdjustment) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.saveDailyAdjustment(input);
}

export async function clearDailyAdjustment(date: string) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.clearDailyAdjustment(date);
}

export async function getReport(range: "day" | "week" | "month") {
  return remoteMode() ? remote.getReport(range) : local.getReport(range);
}

export async function getSettings() {
  if (remoteMode()) {
    try {
      return await remote.getSettings();
    } catch {
      return local.getSettings();
    }
  }
  return local.getSettings();
}

export async function updateSettings(input: { companyName: string; supportPhone: string }) {
  return remoteMode() ? remote.updateSettings(input) : local.updateSettings(input);
}

export async function updateProfile(userId: string, input: { firstName: string; lastName: string; phone: string }) {
  return remoteMode() ? remote.updateProfile(userId, input) : local.updateProfile(userId, input);
}

export async function getAdminSecret() {
  return remoteMode() ? (await import("@/lib/panel-secret")).readAdminSecret() : local.getAdminSecret();
}

export async function updateAdminSecret(secret: string) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.updateAdminSecret(secret);
}

export async function listAccounts() {
  if (remoteMode()) {
    try {
      const rows = await remote.listAccounts();
      if (rows.length) return rows;
    } catch {
      // Use the local register when Supabase accounts are not ready.
    }
  }
  return local.listAccounts();
}

export async function createAccount(input: AccountInput) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.createAccount(input);
}

export async function setAccountRole(actorId: string, userId: string, role: Role) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.setAccountRole(actorId, userId, role);
}

export async function setAccountPassword(userId: string, password: string) {
  if (remoteMode()) {
    try {
      await remote.setAccountPassword(userId, password);
      return;
    } catch {
      // Fall back to the local store so admin password changes still work.
    }
  }
  return local.setAccountPassword(userId, password);
}

export async function deleteAccount(actorId: string, userId: string) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.deleteAccount(actorId, userId);
}

export async function getPermissions() {
  if (remoteMode()) {
    const { defaultPermissions } = await import("@/lib/permissions");
    return defaultPermissions();
  }
  return local.getPermissions();
}

export async function setPermissionEnabled(id: string, enabled: boolean) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.setPermissionEnabled(id, enabled);
}

export async function addPermission(label: string, group: PermissionGroup) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.addPermission(label, group);
}

export async function removePermission(id: string) {
  if (remoteMode()) throw new Error("FORBIDDEN");
  return local.removePermission(id);
}
