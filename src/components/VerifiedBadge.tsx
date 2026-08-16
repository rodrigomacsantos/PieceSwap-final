import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

const VerifiedBadge = ({ className, size = 16 }: VerifiedBadgeProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BadgeCheck
          className={className}
          style={{ width: size, height: size, color: 'hsl(var(--accent))' }}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Vendedor verificado</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
