import { Box } from '@/components/ui/box';

interface DoubleRuleProps {
  className?: string;
}

/**
 * The "Daybook" signature: a thin rule followed by a heavier one, the
 * accountant's actual mark for "the figure above this line is final" —
 * used under headline totals (net this month, total deductions, net
 * worth) in place of the dark theme's neon glow, which doesn't survive
 * a light background.
 */
export function DoubleRule({ className }: DoubleRuleProps) {
  return (
    <Box className={`mt-2 w-16 gap-[3px] ${className ?? ''}`}>
      <Box className="h-px bg-border" />
      <Box className="h-[2px] bg-foreground/70" />
    </Box>
  );
}
