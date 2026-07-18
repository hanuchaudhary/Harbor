import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center border-0 font-montreal-mono font-semibold uppercase border-transparent text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden font-semibold",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        blue: "dark:bg-blue-950 dark:text-blue-200 bg-blue-200 text-blue-700",
        red: "dark:bg-red-950 dark:text-red-200 bg-red-200 text-red-700",
        emerald:
          "dark:bg-green-950 dark:text-emerald-200 bg-emerald-200 text-emerald-700",
        yellow:
          "dark:bg-yellow-950 dark:text-yellow-200 bg-yellow-200 text-yellow-700",
        orange:
          "dark:bg-orange-950 dark:text-orange-200 bg-orange-200 text-orange-700",
        purple:
          "dark:bg-purple-950 dark:text-purple-200 bg-purple-200 text-purple-700",
        indigo:
          "dark:bg-indigo-950 dark:text-indigo-200 bg-indigo-200 text-indigo-700",
        cyan: "dark:bg-cyan-950 dark:text-cyan-200 bg-cyan-200 text-cyan-700",
        fuchsia:
          "dark:bg-fuchsia-950 dark:text-fuchsia-200 bg-fuchsia-200 text-fuchsia-700",
        stone:
          "dark:bg-stone-900 dark:text-stone-200 bg-stone-200 text-stone-700",
        neutral:
          "dark:bg-neutral-900 dark:text-neutral-200 bg-neutral-200 text-neutral-700",
      },
      size: {
        default: "px-3 py-1.5",
        sm: "py-.5 px-2 text-[10px]",
        lg: "py-2",
        xs: "py-0.5 px-1 text-[9px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    size?: "default" | "sm" | "lg" | "xs";
  }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
