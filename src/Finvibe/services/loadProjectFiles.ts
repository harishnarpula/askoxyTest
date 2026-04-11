export async function loadProjectFiles(
  fileTree: any[]
) {

  const files: Record<
    string,
    string
  > = {};

  for (const file of fileTree) {

    if (file.mimeType !== "folder") {

      const res =
        await fetch(
          `http://localhost:8080/file/${file.id}/content`
        );

      const content =
        await res.text();

      files[file.path] = content;

    }

  }

  return files;
}