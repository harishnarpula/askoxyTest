import { useEffect, useRef } from "react";
import { getWebContainer } from "../services/webcontainer";
import { mountProject } from "../services/mountProject";

type Props = {
  files: Record<string, string>;
};

export default function ProjectRunner({
  files
}: Props) {

  const iframeRef =
    useRef<HTMLIFrameElement>(null);

  useEffect(() => {

    runProject();

  }, []);

  async function runProject() {

    const webcontainer =
      await getWebContainer();

    await mountProject(
      webcontainer,
      files
    );

    await webcontainer.spawn(
      "npm",
      ["install"]
    );

    const process =
      await webcontainer.spawn(
        "npm",
        ["start"]
      );

    webcontainer.on(
      "server-ready",
      (_port: number, url: string) => {

        if (iframeRef.current) {

          iframeRef.current.src = url;

        }

      }
    );

    process.output.pipeTo(
      new WritableStream({
        write(data) {

          console.log(data);

        }
      })
    );
  }

  return (

    <iframe
      ref={iframeRef}
      style={{
        width: "100%",
        height: "600px",
        border: "none"
      }}
    />

  );
}