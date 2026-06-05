import { Layers } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / showcase panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Foundry Hub
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-medium leading-tight">
            The workspace behind beautifully managed interiors.
          </h1>
          <p className="mt-4 text-primary-foreground/70">
            Build product schedules, import from any vendor, collect client
            approvals and export studio-grade documentation — all in one place.
          </p>
        </div>

        <div className="relative flex gap-8 text-sm text-primary-foreground/70">
          <div>
            <div className="font-display text-2xl text-primary-foreground">
              3×
            </div>
            faster schedules
          </div>
          <div>
            <div className="font-display text-2xl text-primary-foreground">
              1
            </div>
            source of truth
          </div>
          <div>
            <div className="font-display text-2xl text-primary-foreground">
              0
            </div>
            spreadsheets
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
