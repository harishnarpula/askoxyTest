import Editor from "@monaco-editor/react";

type Props = {
  code: string;
};

export default function EditorPanel({
  code
}: Props) {

  return (

    <Editor
      height="500px"
      defaultLanguage="typescript"
      theme="vs-dark"
      value={code}
    />

  );
}