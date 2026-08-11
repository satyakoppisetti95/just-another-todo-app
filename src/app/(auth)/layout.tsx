import { GlassPanel } from "@/components/GlassPanel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-6 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
            Just Another Todo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Reminders with points, friends, and analytics
          </p>
        </div>
        <GlassPanel className="p-6">{children}</GlassPanel>
      </div>
    </div>
  );
}
