export interface CodeFile {
  id: string;
  name: string;
  mimeType?: string;
  folder?: boolean;
  hasChildren?: boolean;
  type?: string;
  children?: CodeFile[] | null;
  content?: string;
  isLoading?: boolean;
}