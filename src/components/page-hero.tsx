import Link from "next/link";

export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <section className="section-shell page-hero"><div className="breadcrumbs"><Link href="/">Главная</Link><span>/</span>{eyebrow}</div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></section>; }
