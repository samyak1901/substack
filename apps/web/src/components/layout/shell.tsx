import Header from "./header";

export default function Shell({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {fullWidth ? (
        children
      ) : (
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      )}
    </div>
  );
}
