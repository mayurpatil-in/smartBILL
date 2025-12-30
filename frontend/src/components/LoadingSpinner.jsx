import { Loader2 } from "lucide-react";

export default function LoadingSpinner({
  fullScreen = true,
  text = "Loading...",
}) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600 dark:text-gray-300 font-medium animate-pulse">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
      <span className="text-gray-500 dark:text-gray-400 text-sm">{text}</span>
    </div>
  );
}
