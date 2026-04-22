import CodeExplorer from "../components/CodeExplorer";
import { useTheme } from "../hooks/useTheme";

export default function CodeExplorerPage() {
  const { theme, toggleTheme } = useTheme();
  return <CodeExplorer theme={theme} onToggleTheme={toggleTheme} />;
}
