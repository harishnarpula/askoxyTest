import { useState } from "react";

export type CodeFile = {
  id: string;
  name: string;
  mimeType: string;
  children?: CodeFile[];
};

type Props = {
  files: CodeFile[];
  onSelect: (file: CodeFile) => void;
};

export default function FileTree({
  files,
  onSelect
}: Props) {

  return (
    <div style={{ padding: "10px" }}>
      {files.map(file => (
        <TreeNode
          key={file.id}
          file={file}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

type NodeProps = {
  file: CodeFile;
  onSelect: (file: CodeFile) => void;
};

function TreeNode({
  file,
  onSelect
}: NodeProps) {

  const [expanded, setExpanded] =
    useState(false);

  const isFolder =
    file.mimeType ===
    "application/vnd.google-apps.folder";

  const toggleFolder = () => {

    if (isFolder)
      setExpanded(!expanded);

    else
      onSelect(file);

  };

  return (

    <div
      style={{
        marginLeft: "10px",
        cursor: "pointer"
      }}
    >

      <div onClick={toggleFolder}>

        {isFolder
          ? expanded
            ? "📂"
            : "📁"
          : "📄"}{" "}

        {file.name}

      </div>

      {expanded &&
        file.children &&
        file.children.map(child => (

          <TreeNode
            key={child.id}
            file={child}
            onSelect={onSelect}
          />

        ))}

    </div>

  );
}