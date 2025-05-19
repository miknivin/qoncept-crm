export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("rendered full width");
  
  return <div>{children}</div>;
}
