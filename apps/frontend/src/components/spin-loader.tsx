import { IconLoader2 } from "@tabler/icons-react";
import React from "react";

export const SpinLoader = () => {
  return (
    <div className="min-h-120 flex items-center justify-center">
      <IconLoader2 className="animate-spin" size={24} />
    </div>
  );
};
