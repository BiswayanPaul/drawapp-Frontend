// Everything is the board: the canvas fills the viewport and every other piece of
// UI floats over it as glass. Pages without a canvas (room lock, sign-in needed)
// sit on a soft backdrop so the glass still has something to frost.
export default function BoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="board-backdrop flex min-h-dvh flex-col">{children}</div>;
}
