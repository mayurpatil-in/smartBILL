import { Link, useLocation } from "react-router-dom";

export default function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="text-xs text-gray-500 dark:text-gray-400 w-full overflow-hidden">
      <ol className="flex items-center gap-1 sm:gap-2 w-full overflow-hidden whitespace-nowrap">
        <li className="shrink-0">
          <Link to="/" className="hover:underline">
            Dashboard
          </Link>
        </li>

        {paths.map((path, index) => {
          const url = `/${paths.slice(0, index + 1).join("/")}`;
          const isLast = index === paths.length - 1;
          return (
            <li key={index} className={`flex items-center gap-1 sm:gap-2 ${isLast ? 'min-w-0 overflow-hidden' : 'shrink-0'}`}>
              <span className="shrink-0">/</span>
              <Link to={url} className="capitalize hover:underline truncate">
                {path}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
