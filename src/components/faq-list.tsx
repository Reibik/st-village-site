interface FaqItem { readonly question: string; readonly answer: string }

export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return <div className="faq-list">{items.map((item) => <details className="faq-item" key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>;
}
