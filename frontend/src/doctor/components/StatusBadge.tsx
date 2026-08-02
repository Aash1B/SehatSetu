import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-600",
        primary: "bg-blue-50 text-blue-600",
        warning: "bg-orange-100 text-orange-700",
        success: "bg-green-50 text-green-700",
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
