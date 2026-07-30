import Link from "next/link";

interface SectionHeadingProps { eyebrow: string; title: string; text: string; action?: { label: string; href: string } }

export function SectionHeading({ eyebrow, title, text, action }: SectionHeadingProps) {
  const content = <div className="section-heading"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{text}</p></div>;
  if (!action) return content;
  return <div className="section-heading-row">{content}<Link className="text-link" href={action.href}>{action.label} <span>→</span></Link></div>;
}
