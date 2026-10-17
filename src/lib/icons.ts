import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function iconFor(name: string): LucideIcon {
  return ((Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Box) as LucideIcon;
}

export const ICON_CHOICES = ["Users", "UserCog", "Sparkles", "CalendarClock", "BadgeCheck", "ScanLine", "Dumbbell", "Package", "ShoppingBag", "CreditCard", "Boxes", "LayoutGrid", "ChefHat", "Pill", "Receipt", "BarChart3", "Stethoscope", "Scissors", "Coffee", "Store", "Puzzle", "Truck", "Heart", "Star"];
