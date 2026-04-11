type Props = {
  code: string;
};

export default function PreviewPanel({
  code
}: Props) {

  return (

    <iframe
      title="preview"
      style={{
        width: "100%",
        height: "400px",
        border: "1px solid #333"
      }}
      srcDoc={code}
    />

  );
}