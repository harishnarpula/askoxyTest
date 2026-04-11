import { WebContainer } from "@webcontainer/api";

let webcontainerInstance: WebContainer;

export async function getWebContainer() {

  if (!webcontainerInstance) {

    webcontainerInstance =
      await WebContainer.boot();

  }

  return webcontainerInstance;
}