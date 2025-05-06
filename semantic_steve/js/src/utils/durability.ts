import { Item as PItem } from "prismarine-item";

export function getDurabilityPercentRemaining(item: PItem): number | undefined {
  if (item.durabilityUsed) {
    return Math.floor((1 - item.durabilityUsed / item.maxDurability) * 100);
  }
}

export function getDurabilityRemainingString(item: PItem): string | undefined {
  const durability = getDurabilityPercentRemaining(item);
  if (durability !== undefined) {
    return `${durability}%`;
  }
}
