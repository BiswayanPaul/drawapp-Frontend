// Boards are full-screen: no site navbar, the canvas fills the viewport and the
// controls float on top of it.
export default function BoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="bg-dots flex min-h-dvh flex-col bg-muted/40">{children}</div>;
}
