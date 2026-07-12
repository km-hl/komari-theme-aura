import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Flag } from "@/components/ui/Flag";


export function VisitorCard() {
  const [visitor, setVisitor] = useState<{
    ip: string;
    country: string;
    countryCode: string;
    city: string;
    org: string;
  } | null>(null);

  const [os, setOs] = useState("Unknown OS");
  const [browser, setBrowser] = useState("Unknown Browser");


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


    // Fetch IP info
    fetch("https://get.geojs.io/v1/ip/geo.json", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        let orgString = data.organization || data.organization_name || "Unknown ISP";
        if (data.asn && !orgString.includes(String(data.asn))) {
          orgString = `AS${data.asn} ${orgString}`;
        }
        
        setVisitor({
          ip: data.ip,
          country: data.country,
          countryCode: data.country_code,
          city: data.city,
          org: orgString,
        });
      })
      .catch(console.error);
  }, []);

  return (
    <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 transition-opacity">
        <UserIcon className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-2 mb-1" title={visitor ? [visitor.city, visitor.country].filter(Boolean).join(", ") : "Loading..."}>
        {visitor && visitor.countryCode && (
          <Flag region={visitor.countryCode} className="w-8 h-auto shadow-sm rounded-[2px] shrink-0" />
        )}
        <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] truncate">
          {visitor ? visitor.country : "-"}
        </div>
      </div>
      <div className="text-[13px] text-[var(--text-secondary)] font-medium flex items-center justify-between">
        <span className="truncate">访客 · {visitor ? visitor.ip : "..."}</span>
        <span className="text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)] shrink-0 ml-2">
          {os === "Unknown OS" ? "N/A" : os} / {browser === "Unknown Browser" ? "N/A" : browser.split(" ")[0]}
        </span>
      </div>
      {visitor && visitor.org && (
        <div className="text-[12px] text-[var(--text-tertiary)] flex items-center gap-1.5 truncate mt-1.5">
          <ShieldCheck size={12} className="shrink-0" />
          <span className="truncate">{visitor.org}</span>
        </div>
      )}
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
