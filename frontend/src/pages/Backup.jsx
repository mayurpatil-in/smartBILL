import React from "react";
import BackupTab from "../components/settings/BackupTab";

const BackupPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Backups
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage database backups and restoration.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6">
          <BackupTab />
        </div>
      </div>
    </div>
  );
};

export default BackupPage;
