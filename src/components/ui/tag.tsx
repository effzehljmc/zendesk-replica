import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tag as TagType } from "@/types/ticket";

interface TagProps extends React.HTMLAttributes<HTMLDivElement> {
  tag: TagType;
  onRemove?: () => void;
  interactive?: boolean;
}

export function Tag({ tag, onRemove, interactive = true, className, ...props }: TagProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md",
        interactive && "hover:opacity-80",
        className
      )}
      style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
      {...props}
    >
      <span>{tag.name}</span>
      {interactive && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 hover:bg-black/10 rounded-sm"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// Helper function to determine text color based on background color
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
} 