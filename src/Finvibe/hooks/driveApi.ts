import BASE_URL from "../../Config";
import type { CodeFile } from "../type/file";

export async function fetchProjects(): Promise<CodeFile[]> {
  const response = await fetch(`${BASE_URL}/vibecode-service/projects`);
  if (!response.ok) throw new Error("Failed to fetch projects");
  return response.json();
}

export async function fetchProjectTitles(): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/vibecode-service/projects/titles`);
  if (!response.ok) throw new Error("Failed to fetch project titles");
  return response.json();
}

export async function fetchProjectChildren(projectId: string): Promise<CodeFile[]> {
  const response = await fetch(`${BASE_URL}/vibecode-service/projects/${projectId}/children`);
  if (!response.ok) throw new Error(`Failed to fetch children for project: ${projectId}`);
  return response.json();
}

export async function fetchFolderFiles(folderId: string): Promise<CodeFile[]> {
  const response = await fetch(`${BASE_URL}vibecode-service/folder/${folderId}/files`);
  if (!response.ok) throw new Error(`Failed to fetch files for folder: ${folderId}`);
  return response.json();
}

export async function fetchProjectFiles(title: string): Promise<CodeFile[]> {
  const response = await fetch(`${BASE_URL}vibecode-service/projects?title=${encodeURIComponent(title)}`);
  if (!response.ok) throw new Error(`Failed to fetch files for project: ${title}`);
  return response.json();
}

export async function fetchFileContent(fileId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}vibecode-service/file/${fileId}/content`);
  if (!response.ok) throw new Error("Failed to fetch file content");
  return response.text();
}
