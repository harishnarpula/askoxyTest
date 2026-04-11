import { useState } from "react";
import { CodeFile } from "../type/file";

interface Props {
  file: CodeFile;
  onSelect: (file: CodeFile) => void;
}

export default function FileNode({
  file,
  onSelect
}: Props) {

  const [expanded, setExpanded] = useState(false);

  const isFolder =
    file.type === "application/vnd.google-apps.folder";

  return (
    <div className="file-node">

      <div
        className="file-label"
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            onSelect(file);
          }
        }}
      >
        {isFolder ? "📁" : "📄"} {file.name}
      </div>

      {expanded && file.children && (
        <div className="file-children">
          {file.children.map(child => (
            <FileNode
              key={child.id}
              file={child}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}