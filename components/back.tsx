import { cn } from "@/lib/utils";
import { IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
export default function BackButton({
  href,
  className,
}: {
  href?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-xs font-semibold uppercase font-montreal-mono cursor-pointer text-red-400 hover:text-red-500",
        className,
      )}
      onClick={() => (href ? router.push(href) : router.back())}
    >
      <IconArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
