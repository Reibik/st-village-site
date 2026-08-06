const countryLabels: Record<string, string> = {
  CH: "Швейцария",
  DE: "Германия",
  FI: "Финляндия",
  NL: "Нидерланды",
  PL: "Польша",
  SE: "Швеция",
};

export function CountryFlag({ code }: { code: string }) {
  const normalizedCode = code.toUpperCase();
  const country = countryLabels[normalizedCode];
  if (!normalizedCode) return <span className="flag-placeholder" role="img" aria-label="Группа серверов">ST</span>;
  if (!country) return <span className="flag-placeholder" aria-label={`Код страны ${normalizedCode}`}>{normalizedCode}</span>;
  return <span className={`flag-placeholder country-flag flag-${normalizedCode.toLowerCase()}`} role="img" aria-label={`Флаг страны ${country}`} />;
}
