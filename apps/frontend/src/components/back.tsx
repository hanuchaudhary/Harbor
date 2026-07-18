import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";

import { IconArrowLeft } from "@tabler/icons-react";
export default function BackButton({
  href,
  className,
}: {
  href?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-xs font-semibold uppercase font-montreal-mono cursor-pointer text-red-400 hover:text-red-500",
        className,
      )}
      onClick={() => (href ? navigate(href) : navigate(-1))}
    >
      <IconArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
