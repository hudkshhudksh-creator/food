import type { Credit } from "@/types";

export type CreditPerson = {
  key: string;
  lastName: string;
  firstName: string;
  branchId: string;
  branchName: string;
  total: number;
  count: number;
  items: Credit[];
};

export function creditPersonKey(lastName: string, firstName: string, branchId: string) {
  return [lastName.trim().toLowerCase(), firstName.trim().toLowerCase(), branchId].join("|");
}

export function groupCredits(credits: Credit[]): CreditPerson[] {
  const map = new Map<string, CreditPerson>();
  for (const credit of credits) {
    const key = creditPersonKey(credit.lastName, credit.firstName, credit.branchId);
    const existing = map.get(key);
    if (existing) {
      existing.total += credit.amount;
      existing.count += 1;
      existing.items.push(credit);
      continue;
    }
    map.set(key, {
      key,
      lastName: credit.lastName,
      firstName: credit.firstName,
      branchId: credit.branchId,
      branchName: credit.branchName,
      total: credit.amount,
      count: 1,
      items: [credit],
    });
  }
  return [...map.values()]
    .map((person) => ({
      ...person,
      items: [...person.items].sort((a, b) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : a.createdAt < b.createdAt ? 1 : -1)),
    }))
    .sort((a, b) => b.total - a.total || a.lastName.localeCompare(b.lastName, "mn"));
}

export function creditsByMonth(items: Credit[]) {
  const map = new Map<string, { month: string; total: number; items: Credit[] }>();
  for (const item of items) {
    const month = item.takenAt.slice(0, 7);
    const existing = map.get(month);
    if (existing) {
      existing.total += item.amount;
      existing.items.push(item);
      continue;
    }
    map.set(month, { month, total: item.amount, items: [item] });
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? 1 : -1));
}
