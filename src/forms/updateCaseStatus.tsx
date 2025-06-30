import React, { useEffect, useState } from "react";
import { CircleX } from "lucide-react";
import { SelectField } from "./addCase";
import { DisposalOfCase } from "../types/case";
import { invoke } from "@tauri-apps/api/core";

interface CaseUpdateFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formId: string;
}

const CaseUpdateForm: React.FC<CaseUpdateFormProps> = ({ isOpen, onClose, title, formId }) => {
  const [currentDate, setCurrentDate] = useState("");
  const [currentDay, setCurrentDay] = useState("");

  const caseType = Object.values(DisposalOfCase).map((option) => ({
      value: option,
      label: option,
  }));

  useEffect(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const dayStr = now.toLocaleDateString(undefined, { weekday: "long" });
    setCurrentDate(dateStr);
    setCurrentDay(dayStr);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const ndohDateStr = formData.get("ndoh-date")?.toString();
    if (ndohDateStr) {
      const selectedDate = new Date(ndohDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Strip time portion for accurate comparison

      if (selectedDate < today) {
        alert("NDOH Date cannot be in the past.");
        return;
      }
    }

    invoke("update_case", {
      payload: {
        case_no: parseInt(formData.get("case-no")?.toString() || "0", 10),
        disposal_of_case: formData.get("disposal-of-case"),
        ndoh_date: ndohDateStr,
        ndoh_time: formData.get("ndoh-time"),
        connected: parseInt(formData.get("connected")?.toString() || "0", 10),
      }
    }).then(() => {
      console.log("Case updated successfully");
    }).catch((err) => {
      console.error("Error updating case:", err);
    });

    e.currentTarget.reset();
    onClose();
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
      <div className="bg-white p-6 rounded-xl shadow-lg w-[75%]">
        <div className="flex justify-end">
          <button
            onClick={() => {
              const form = document.getElementById(formId) as HTMLFormElement | null;
              if (form) form.reset();
              onClose();
            }}
            className="text-gray-600 hover:text-red-600"
          >
            <CircleX />
          </button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          <div className="text-right">
            <p className="text-lg text-gray-600">{currentDate}</p>
            <p className="text-lg text-gray-600">{currentDay}</p>
          </div>
        </div>

        <form id={formId} className="space-y-6" onSubmit={handleSubmit}>
          <input
            type="text"
            id="case-no"
            name="case-no"
            placeholder="Enter case number"
            className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
            pattern="\d{6}"        // ensures exactly 6 digits
            maxLength={6}          // limits input length to 6 characters
            inputMode="numeric"    // shows numeric keyboard on mobile
            required
          />

          <SelectField
            id="disposal-of-case"
            label="Disposal of Case"
            options={caseType}
          />

          <div>
            <label htmlFor="connected" className="block text-sm font-medium text-gray-700 mb-1">Connected</label>
            <input
              type="number"
              id="connected"
              name="connected"
              min={0}    
              max={99}              
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
              placeholder="Enter connected value (0–99)"
              required
            />
          </div>

          <div>
            <label htmlFor="ndoh-date" className="block text-sm font-medium text-gray-700 mb-1">NDOH Date (If not settled)</label>
            <input
              type="date"
              id="ndoh-date"
              name="ndoh-date"
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>

          <SelectField
            id="ndoh-time"
            label="Time"
            options={[
              "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
              "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
              "16:00", "16:30", "17:00",
            ]}
          />

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Update Status
          </button>
        </form>

      </div>
    </div>
  );
};

export default CaseUpdateForm;

