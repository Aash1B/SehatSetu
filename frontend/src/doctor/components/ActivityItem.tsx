import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ActivityItemProps {
  message: string;
  timeAgo: string;
  icon: LucideIcon;
  colorScheme?: 'blue' | 'purple' | 'red' | 'orange' | 'green';
}

const colorMap = {
  blue: "bg-blue-50 text-blue-500",
  purple: "bg-purple-50 text-purple-500",
  red: "bg-red-50 text-red-500",
  orange: "bg-orange-50 text-orange-500",
  green: "bg-green-50 text-green-500",
};

const ActivityItem: React.FC<ActivityItemProps> = ({
  message,
  timeAgo,
  icon: Icon,
  colorScheme = 'blue'
}) => {
  return (
    <div className="flex gap-4">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", colorMap[colorScheme])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-deep-space">{message}</p>
        <p className="text-xs text-aster-blue mt-1">{timeAgo}</p>
      </div>
    </div>
  );
};

export default ActivityItem;
