import { Link, useLocation } from "react-router-dom";

export default function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="text-xs text-gray-500 dark:text-gray-400">
      <ol className="flex items-center gap-2">
        <li>
          <Link to="/" className="hover:underline">
            Dashboard
          </Link>
        </li>

        {paths.map((path, index) => {
          const url = `/${paths.slice(0, index + 1).join("/")}`;
          return (
            <li key={index} className="flex items-center gap-2">
              <span>/</span>
              <Link to={url} className="capitalize hover:underline">
                {path}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
