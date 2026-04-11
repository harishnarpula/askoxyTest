type FileMap = {
  [path: string]: string;
};

export async function mountProject(
  webcontainer: any,
  files: FileMap
) {

  const tree: any = {};

  Object.entries(files).forEach(
    ([path, content]) => {

      tree[path] = {
        file: {
          contents: content
        }
      };

    }
  );

  await webcontainer.mount(tree);
}