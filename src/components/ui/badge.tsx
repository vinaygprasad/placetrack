import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#1e3a8a] text-white hover:bg-[#162a66]",
        secondary:
          "border-transparent bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold",
        destructive:
          "border-red-200 bg-red-50 text-red-700 font-bold",
        outline: "text-slate-700 border-slate-300 bg-slate-50 font-semibold",
        placed: "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold",
        accepted: "bg-blue-50 text-[#1e3a8a] border border-blue-200 font-bold",
        process: "bg-amber-50 text-amber-900 border border-amber-200 font-bold",
        unplaced: "bg-slate-100 text-slate-700 border border-slate-200 font-bold",
        higher: "bg-purple-50 text-purple-900 border border-purple-200 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
