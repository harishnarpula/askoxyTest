interface LayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export default function Layout({
  sidebar,
  content
}: LayoutProps) {
  return (
    <div className="layout">
      <div className="sidebar">{sidebar}</div>
      <div className="content">{content}</div>
    </div>
  );
}