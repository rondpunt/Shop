import { pickSlogan, type SloganState } from "@/lib/slogans";

type Props = {
  state: SloganState;
  /** Optional inline detail to append, e.g. "80 m verderop" */
  detail?: string;
  className?: string;
};

export const Slogan = ({ state, detail, className = "" }: Props) => {
  const text = pickSlogan(state);
  if (!text) return null;
  return (
    <p
      className={`font-slogan text-[16px] leading-snug text-muted-foreground ${className}`}
    >
      <span>{text}</span>
      {detail && (
        <span className="ml-1.5 not-italic text-[13px] font-semibold text-primary-deep">
          {detail}
        </span>
      )}
    </p>
  );
};
