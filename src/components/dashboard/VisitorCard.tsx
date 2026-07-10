import { useEffect, useState } from "react";


export function VisitorCard() {
  const [visitor, setVisitor] = useState<{
    ip: string;
    country: string;
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
    <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 transition-opacity">
        <UserIcon className="w-4 h-4" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1 truncate" title={visitor ? [visitor.city, visitor.country].filter(Boolean).join(", ") : "Loading..."}>
        {visitor ? visitor.country : "-"}
      </div>
      <div className="text-[13px] text-[var(--text-secondary)] font-medium flex items-center justify-between">
        <span className="truncate">访客 · {visitor ? visitor.ip : "..."}</span>
        <span className="text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)] shrink-0">
          {os === "Unknown OS" ? "N/A" : os} / {browser === "Unknown Browser" ? "N/A" : browser.split(" ")[0]}
        </span>
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
