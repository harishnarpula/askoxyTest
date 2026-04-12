import { Routes, Route, Navigate } from "react-router-dom";
import Finvibe3DLanding from "./Finvibe/Finvibe3DLanding";
import Landing from "./Finvibe/Landing";
import CodeExplorerPage from "./Finvibe/components/CodeExplorerPage";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Finvibe3DLanding />} />
      <Route path="/finvibe-code-builder" element={<Landing />} />
      <Route path="/insurvibe-code-builder" element={<Landing />} />
      <Route path="/bfsi-projects" element={<CodeExplorerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
