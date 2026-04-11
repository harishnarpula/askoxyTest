import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProjects } from "../hooks/driveApi";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  return (
    <div className="project-list">
      <h2>Projects</h2>

      {projects.map(project => (
        <button
          key={project.id}
          className="project-card"
          onClick={() =>
            navigate(`/project/${project.id}`)
          }
        >
             📁 {project.name}
        </button>
      ))}
    </div>
  );
}