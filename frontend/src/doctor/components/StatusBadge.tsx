import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800",
        primary: "bg-[#223382] text-white font-medium shadow-2xs",
        warning: "bg-amber-100 text-amber-900",
        success: "bg-emerald-600 text-white font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  label: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ className, variant, label, ...props }) => {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {label}
    </span>
  );
};

export default StatusBadge;
