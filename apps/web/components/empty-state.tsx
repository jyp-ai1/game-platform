import { Gamepad2, type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Gamepad2,
  message,
}: {
  icon?: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
