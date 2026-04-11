import { CodeFile } from "../type/file";
import { FileSystemTree } from "@webcontainer/api";

export function buildFileSystemTree(files: CodeFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  function processNode(node: CodeFile, parentPath: string = "") {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.children && node.children.length > 0) {
      // It's a directory
      const dirTree: FileSystemTree = {};
      node.children.forEach(child => {
        const childResult = processNode(child, currentPath);
        if (childResult) {
          Object.assign(dirTree, childResult);
        }
      });
      return { [node.name]: { directory: dirTree } };
    } else {
      // It's a file - content will be loaded when needed
      return { [node.name]: { file: { contents: "" } } };
    }
  }

  files.forEach(file => {
    const result = processNode(file);
    if (result) {
      Object.assign(tree, result);
    }
  });

  return tree;
}

export async function loadFileContents(
  tree: CodeFile[],
  fetchContent: (fileId: string) => Promise<string>
): Promise<Map<string, string>> {
  const fileContents = new Map<string, string>();

  async function traverse(node: CodeFile, path: string = "") {
    const currentPath = path ? `${path}/${node.name}` : node.name;

    if (node.children && node.children.length > 0) {
      // Directory - traverse children
      for (const child of node.children) {
        await traverse(child, currentPath);
      }
    } else {
      // File - fetch content
      try {
        const content = await fetchContent(node.id);
        fileContents.set(currentPath, content);
      } catch (error) {
        console.error(`Failed to load ${currentPath}:`, error);
        fileContents.set(currentPath, "");
      }
    }
  }

  for (const file of tree) {
    await traverse(file);
  }

  return fileContents;
}

export function buildWebContainerTree(
  structure: CodeFile[],
  contents: Map<string, string>
): FileSystemTree {
  const tree: FileSystemTree = {};

  function processNode(node: CodeFile, parentPath: string = ""): any {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.children && node.children.length > 0) {
      // Directory
      const dirTree: FileSystemTree = {};
      node.children.forEach(child => {
        const childName = child.name;
        const childResult = processNode(child, currentPath);
        dirTree[childName] = childResult;
      });
      return { directory: dirTree };
    } else {
      // File
      const content = contents.get(currentPath) || "";
      return { file: { contents: content } };
    }
  }

  structure.forEach(node => {
    tree[node.name] = processNode(node);
  });

  return tree;
}
