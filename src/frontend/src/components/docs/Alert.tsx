import { ReactNode } from "react";
import clsx from "clsx";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

type AlertType = "info" | "warning" | "success";

export default function Alert({
  type = "info",
  title,
  children,
}: {
  type?: AlertType;
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    info: "bg-blue-50/70 border-blue-200 text-blue-950",
    warning: "bg-amber-50/70 border-amber-200 text-amber-950",
    success: "bg-emerald-50/70 border-emerald-200 text-emerald-950",
  };

  const iconColors = {
    info: "text-[#2563EB]",
    warning: "text-amber-600",
    success: "text-emerald-600",
  };

  const iconNames: Record<AlertType, "description" | "speed" | "check_circle"> = {
    info: "description",
    warning: "speed",
    success: "check_circle",
  };

  return (
    <div
      className={clsx(
        "rounded-xl border p-4 flex gap-3 my-2 text-[13.5px] leading-relaxed transition-colors",
        styles[type]
      )}
    >
      <div className="shrink-0 mt-0.5">
        <MaterialIcon name={iconNames[type]} className={clsx("w-4 h-4", iconColors[type])} />
      </div>
      <div className="flex-1 min-w-0">
        {title && <div className="font-bold text-[13px] mb-1">{title}</div>}
        <div className="opacity-90 [&_code]:text-inherit [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[12px]">
          {children}
        </div>
      </div>
    </div>
  );
}
