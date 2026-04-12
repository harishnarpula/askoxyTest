import type { CodeFile } from "../type/file";
import { fetchProjectChildren, fetchFolderFiles, fetchFileContent } from "../hooks/driveApi";

export interface LoadProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

export async function loadProjectStructure(
  projectId: string,
  onTreeUpdate?: (tree: CodeFile[]) => void
): Promise<{ tree: CodeFile[]; fileCache: Map<string, string> }> {
  const fileCache = new Map<string, string>();
  
  // Step 1: Get top-level items using /projects/{id}/children
  const topLevelItems = await fetchProjectChildren(projectId);
  
  // Show items immediately with loading state
  const itemsWithLoadingState = topLevelItems.map(item => ({
    ...item,
    children: item.hasChildren ? [] : null,
    isLoading: item.hasChildren
  }));
  
  onTreeUpdate?.(itemsWithLoadingState);
  
  // Step 2: Process each item based on hasChildren property from children API
  const processedItems: CodeFile[] = [];
  for (const item of topLevelItems) {
    
    // Check hasChildren property (from /projects/{id}/children API)
    if (item.hasChildren === true) {
      // This is a FOLDER - hit /folder/{id}/files to get complete structure
      const completeStructure = await fetchFolderFiles(item.id);
      console.log(`[driveApi] folder "${item.name}" files:`, JSON.stringify(completeStructure, null, 2));
      
      const folderWithStructure = {
        ...item,
        children: completeStructure,
        isLoading: false
      };
      
      processedItems.push(folderWithStructure);
      
      // Update UI to show the structure
      const currentTree = [
        ...processedItems,
        ...topLevelItems.slice(processedItems.length).map(f => ({
          ...f,
          children: f.hasChildren ? [] : null,
          isLoading: f.hasChildren
        }))
      ];
      onTreeUpdate?.(currentTree);
      
      // Find all files in this structure and load their content
      const allFiles = collectAllFiles(completeStructure);
      
      // Load all file contents in parallel
      await Promise.all(
        allFiles.map(async (file) => {
          try {
            const content = await fetchFileContent(file.id);
            fileCache.set(file.id, content);
          } catch (error) {
            console.error(`Failed to load ${file.name}:`, error);
          }
        })
      );
      
    } else {
      // This is a FILE (hasChildren === false) - hit /file/{id}/content directly
      const fileItem = {
        ...item,
        children: null,
        isLoading: false
      };
      
      processedItems.push(fileItem);
      
      // Update UI
      const currentTree = [
        ...processedItems,
        ...topLevelItems.slice(processedItems.length).map(f => ({
          ...f,
          children: f.hasChildren ? [] : null,
          isLoading: f.hasChildren
        }))
      ];
      onTreeUpdate?.(currentTree);
      
      // Load file content directly
      try {
        const content = await fetchFileContent(item.id);
        fileCache.set(item.id, content);
      } catch (error) {
        console.error(`Failed to load ${item.name}:`, error);
      }
    }
  }
  
  return { tree: processedItems, fileCache };
}

// Recursively collect all files from the structure
function collectAllFiles(items: CodeFile[]): CodeFile[] {
  const files: CodeFile[] = [];

  for (const item of items) {
    const isFolder =
      item.hasChildren === true ||
      (Array.isArray(item.children) && item.children.length > 0) ||
      item.mimeType === "folder" ||
      item.type === "folder";

    if (isFolder && Array.isArray(item.children) && item.children.length > 0) {
      files.push(...collectAllFiles(item.children));
    } else if (!isFolder) {
      files.push(item);
    }
  }

  return files;
}
