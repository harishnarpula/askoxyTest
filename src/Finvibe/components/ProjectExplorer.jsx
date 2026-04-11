import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProjects } from "../hooks/driveApi";

import Layout from "../components/Layout";
import FileTree from "../components/FileTree";
import CodeViewer from "../components/CodeViewer";
import Loader from "../components/Loader";

export default function ProjectExplorer() {

  const { id } = useParams();

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    fetchProjects().then(data => {

      if (id) {
        const project = data.find(p => p.id === id);
        setFiles(project?.children || []);
      } else {
        setFiles(data);
      }
      setLoading(false);

    });

  }, [id]);

  if (loading) return <Loader />;

  return (

    <Layout
      sidebar={
        <FileTree
          files={files}
          onSelect={setSelectedFile}
        />
      }
      content={
        <CodeViewer file={selectedFile} />
      }
    />

  );
}