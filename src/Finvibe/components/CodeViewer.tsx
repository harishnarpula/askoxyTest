import { useEffect, useState } from "react";
import type { CodeFile } from "../type/file";
import { fetchFileContent } from "../hooks/driveApi";

interface Props {
  file: CodeFile | null;
}

export default function CodeViewer({ file }: Props) {

  const [content, setContent] =
    useState<string>("");

  useEffect(() => {

    if (!file) return;

    fetchFileContent(file.id)
      .then(setContent);

  }, [file]);

  if (!file) {
    return (
      <div className="empty-viewer">
        Select a file
      </div>
    );
  }

  return (
    <div className="code-viewer">
      <h3>{file.name}</h3>

      <pre>{content}</pre>
    </div>
  );
}