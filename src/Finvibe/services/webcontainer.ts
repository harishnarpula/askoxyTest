import { WebContainer } from "@webcontainer/api";

let webcontainerInstance: WebContainer;

export async function getWebContainer() {
  if (!webcontainerInstance) {
    webcontainerInstance = await WebContainer.boot({
      workdirName: "project",
      coep: "credentialless",
    });
  }
  return webcontainerInstance;
}
