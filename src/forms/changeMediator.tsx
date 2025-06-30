import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { CircleX } from "lucide-react";
import { useAssignedTo } from "../lib/assignedContext";

interface ManageAssignedToProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageAssignedTo: React.FC<ManageAssignedToProps> = ({ isOpen, onClose }) => {
    const { options, loading } = useAssignedTo();
  
    if (loading) {
      return <p>Loading...</p>;
    }


  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = formData.get("new-assigned-to") as string;
    if (!newName.trim()) return;

    await invoke("add_assigned_to", { name: newName.trim() });
    console.log(`Added: ${newName}`);
    e.currentTarget.reset();
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    await invoke("delete_assigned_to", { name });
    console.log(`Deleted: ${name}`);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: -100,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#00000088",
        display: isOpen ? "flex" : "none",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "100px",
        zIndex: 50,
      }}
    >
      <div className="bg-white p-6 rounded-xl shadow-lg w-[75%] max-w-lg">
        <div className="flex justify-end">
          <button
            onClick={() => {
              onClose();
            }}
            className="text-gray-600 hover:text-red-600"
          >
            <CircleX />
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-4">Manage Assigned To</h1>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            name="new-assigned-to"
            placeholder="Add new assigned to..."
            className="flex-grow border px-4 py-2 rounded shadow-sm"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700"
          >
            Add
          </button>
        </form>

        <h3 className="text-lg font-semibold mb-2">Current Assigned To:</h3>
        {options.length === 0 ? (
          <p className="text-gray-500">No entries found.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <li
                key={option.value}
                className="flex justify-between items-center border-b py-1"
              >
                <span>{option.label}</span>
                <button
                  onClick={() => handleDelete(option.value)}
                  className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-400"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ManageAssignedTo;
