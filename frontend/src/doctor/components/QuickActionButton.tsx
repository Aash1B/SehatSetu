import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors shadow-sm",
  {
    variants: {
      variant: {
        primary: "bg-habanero hover:bg-[#e0750e] text-white",
        "outline-danger": "bg-transparent hover:bg-red-50 text-red-500 border border-red-200",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface QuickActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  label: string;
  icon: LucideIcon;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ className, variant, label, icon: Icon, ...props }) => {
  return (
    <button className={cn(buttonVariants({ variant }), className)} {...props}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
};

export default QuickActionButton;
