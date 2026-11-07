export function AppFrame({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground md:h-screen md:flex-row md:gap-3 md:overflow-hidden md:p-3">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:outline-2 focus:outline-offset-2 focus:outline-ring">
        Skip to content
      </a>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col md:min-h-0">{children}</div>
    </div>
  );
}
