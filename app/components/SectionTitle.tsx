import { FiArrowUpRight } from "react-icons/fi";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: () => void;
  actionLabel?: string;
  icon?: ReactNode;
};

export default function SectionTitle({
  title,
  subtitle,
  action,
  actionLabel = "View all",
  icon,
}: Props) {
  return (
    <div className="section-heading">
      <div>
        <h2>
          {icon}
          <span>{title}</span>
        </h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button type="button" className="text-link" onClick={action}>
          {actionLabel}
          <FiArrowUpRight />
        </button>
      )}
    </div>
  );
}
