type NodePriceBadgeProps = {
  label: string;
  title?: string;
};

export function NodePriceBadge({ label, title }: NodePriceBadgeProps) {
  return (
    <span
      title={title}
      className="mr-2 shrink-0 text-[14px] leading-none font-normal text-[var(--canvas-node-fg-muted)]"
    >
      {label}
    </span>
  );
}

