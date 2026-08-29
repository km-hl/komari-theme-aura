import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { Spinner } from "@/components/ui/Spinner";
import { queryClient } from "@/services/queryClient";

export function DevLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!import.meta.env.DEV) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          ...(twoFactorCode.trim() ? { "2fa_code": twoFactorCode.trim() } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        status?: string;
        message?: string;
      } | null;

      if (
        !response.ok ||
        (payload?.status && payload.status.toLowerCase() !== "success")
      ) {
        throw new Error(payload?.message || `登录失败 (${response.status})`);
      }

      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/?view=theme-manage", { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请检查账号信息。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5 py-2">
      <Link to="/" className="instance-page-back">
        <ArrowLeft size={14} />
        返回首页
      </Link>
      <InstancePanel
        title="本地主控登录"
        description="仅在开发模式显示。登录信息会通过本地代理直接提交到当前 .env.local 指向的 Komari 主控。"
        aside={<LogIn size={16} />}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
            用户名
            <input
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="surface-inset px-3 py-2.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
            密码
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="surface-inset px-3 py-2.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
            两步验证码（未启用可留空）
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={twoFactorCode}
              onChange={(event) => setTwoFactorCode(event.target.value)}
              className="surface-inset px-3 py-2.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
            />
          </label>
          {error && (
            <div className="rounded-[12px] border border-[color-mix(in_srgb,var(--status-offline)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-offline)_10%,var(--surface))] px-3 py-2 text-[12px] text-[var(--status-offline)]">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="theme-manage-button is-primary mt-1"
          >
            {submitting ? <Spinner size={14} /> : <LogIn size={14} />}
            {submitting ? "登录中" : "登录并进入主题设置"}
          </button>
        </form>
      </InstancePanel>
    </div>
  );
}
