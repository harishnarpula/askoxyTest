import { useTheme } from "./Finvibe/hooks/useTheme";
import CodeExplorer from "./Finvibe/components/CodeExplorer";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return <CodeExplorer theme={theme} onToggleTheme={toggleTheme} />;
}
