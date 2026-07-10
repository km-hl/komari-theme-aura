import { useEffect, useState } from "react";
import { Monitor, ShieldCheck, Clock, MapPin, Search } from "lucide-react";

export function VisitorCard() {
  const [visitor, setVisitor] = useState<{
    ip: string;
    country: string;
    city: string;
    org: string;
  } | null>(null);

  const [os, setOs] = useState("Unknown OS");
  const [browser, setBrowser] = useState("Unknown Browser");
  const [date, setDate] = useState("");

  useEffect(() => {
    // Parse UA
    const ua = navigator.userAgent;
    let osName = "Unknown OS";
    if (ua.indexOf("Win") !== -1) osName = "Windows";
    else if (ua.indexOf("Mac") !== -1) osName = "macOS";
    else if (ua.indexOf("Linux") !== -1) osName = "Linux";
    else if (ua.indexOf("Android") !== -1) osName = "Android";
    else if (ua.indexOf("like Mac") !== -1) osName = "iOS";
    setOs(osName);

    let browserName = "Unknown Browser";
    if (ua.indexOf("Edg") !== -1) browserName = "Edge Browser";
    else if (ua.indexOf("Chrome") !== -1) browserName = "Chrome";
    else if (ua.indexOf("Firefox") !== -1) browserName = "Firefox";
    else if (ua.indexOf("Safari") !== -1) browserName = "Safari";
    else if (ua.indexOf("MSIE") !== -1 || ua.indexOf("Trident/") !== -1) browserName = "Internet Explorer";
    setBrowser(browserName);

    // Date format like 2026年7月10日
    const d = new Date();
    setDate(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`);

    // Fetch IP info
    fetch("https://get.geojs.io/v1/ip/geo.json")
      .then(res => res.json())
      .then(data => {
        setVisitor({
          ip: data.ip,
          country: data.country,
          city: data.city,
          org: data.organization || data.organization_name || data.asn || "Unknown ISP",
        });
      })
      .catch(console.error);
  }, []);

  return (
    <div className="server-card p-6 flex flex-col relative overflow-hidden group">
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <UserIcon className="w-7 h-7 text-white" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            访客
          </h3>
          <p className="text-[14px] text-[var(--text-secondary)]">
            {visitor ? `${visitor.city || visitor.country},` : "Loading..."}
          </p>
          <p className="text-[13px] font-medium text-[var(--text-primary)] mt-0.5">
            {visitor ? `Welcome from ${visitor.country}!` : "Welcome!"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <Monitor size={16} className="shrink-0" />
          <span className="text-[14px] truncate">{os}</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <Search size={16} className="shrink-0" />
          <span className="text-[14px] truncate">{browser}</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <MapPin size={16} className="shrink-0 text-blue-500" />
          <span className="text-[14px] font-mono truncate">{visitor?.ip || "..."}</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <ShieldCheck size={16} className="shrink-0" />
          <span className="text-[14px] truncate">{visitor?.org || "..."}</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <Clock size={16} className="shrink-0" />
          <span className="text-[14px] truncate">{date}</span>
        </div>
      </div>
    </div>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
