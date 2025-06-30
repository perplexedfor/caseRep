import { createContext, useState, useContext, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

export type Option = {
  value: string;
  label: string;
};

interface AssignedToContextType {
  options: Option[];
  loading: boolean;
  fetchOptions: () => Promise<void>;
}

const AssignedToContext = createContext<AssignedToContextType | undefined>(undefined);

export const AssignedToProvider = ({ children }: { children: ReactNode }) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const rawNames = await invoke<string[]>("get_assigned_to_list");
      const formatted = rawNames.map((name) => ({
        value: name,
        label: name.replace(/_/g, " "),
      }));
      setOptions(formatted);
    } catch (error) {
      console.error("Failed to fetch assigned to options:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssignedToContext.Provider value={{ options, loading, fetchOptions }}>
      {children}
    </AssignedToContext.Provider>
  );
};

export const useAssignedTo = () => {
  const context = useContext(AssignedToContext);
  if (!context) {
    throw new Error("useAssignedTo must be used within AssignedToProvider");
  }
  return context;
};

