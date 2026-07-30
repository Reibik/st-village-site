import { platforms } from "@/src/config/content";

export function PlatformStrip() { return <div className="platform-strip"><div className="section-shell platform-inner"><span className="platform-label">Поддерживаемые устройства</span><div className="platforms">{platforms.map((platform) => <span key={platform}>{platform}</span>)}</div></div></div>; }
