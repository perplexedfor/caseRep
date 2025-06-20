import React, { useState, useEffect } from "react";
import { CircleX } from "lucide-react";
import { SelectField } from "./addCase";
import { AssignedTo, NatureOfCase } from "../types/case";
import { invoke } from "@tauri-apps/api/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GenerateSpecificReportProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formId: string;
}

const GenerateSpecificReportForm: React.FC<GenerateSpecificReportProps> = ({ isOpen, onClose, title, formId }) => {
  const [currentDate, setCurrentDate] = useState("");
  const [currentDay, setCurrentDay] = useState("");

  // const caseType = Object.values(DisposalOfCase).map((option) => ({
  //   value: option,
  //   label: option,
  // }));

  const assignedToOptions = Object.values(AssignedTo).map((option) => ({
    value: option,
    label: option.replace(/_/g, " "),
  }));

  const natureOfCaseOptions = Object.values(NatureOfCase).map((option) => ({
    value: option,
    label: option.replace(/([a-z])([A-Z])/g, "$1 $2"), // adds space between camel-case words
  }));

  async function handleFilteredCasesReportPDF(formData: FormData, startDate: string, endDate: string) {
    try {
      const payload = {
        nature_of_case: formData.get("natureOfCase") || null,
        assigned_to: formData.get("assignedTo") || null,
        start_date: startDate,
        end_date: endDate,
      };

      const result = await invoke("query_cases_with_filters", { payload }) as {
        cases: Array<any>,
        summary: {
          settled: number;
          not_settled: number;
          not_fit: number;
          connected: number;
        }
      };

      const sanitize = (text: any) => String(text ?? "").replace(/_/g, " ");

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Filtered Case Report", 14, 20);

      const headers = [
        "Case No",
        "Nature",
        "Received From",
        "Date & Time",
        "Party 1",
        "Party 2",
        "Assigned To",
        "NDOH",
        "Disposal"
      ];

      const rows = result.cases.map((c) => [
        sanitize(c.case_no),
        sanitize(c.nature_of_case),
        sanitize(c.received_from),
        sanitize(`${c.date} ${c.time_slot ?? ""}`),
        sanitize(c.party1),
        sanitize(c.party2),
        sanitize(c.assigned_to),
        c.ndoh_date ? sanitize(`${c.ndoh_date} ${c.ndoh_time ?? ""}`) : "",
        sanitize(c.disposal_of_case),
      ]);

      autoTable(doc, {
        startY: 30,
        head: [headers],
        body: rows,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      // Add summary at the bottom
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text("Summary", 14, finalY);
      doc.setFontSize(10);
      doc.text(`Settled: ${result.summary.settled}`, 14, finalY + 6);
      doc.text(`Not Settled: ${result.summary.not_settled}`, 14, finalY + 12);
      doc.text(`Not Fit: ${result.summary.not_fit}`, 14, finalY + 18);
      doc.text(`Connected: ${result.summary.connected}`, 14, finalY + 24);

      doc.save("filtered_case_report.pdf");
    } catch (error) {
      console.error("Error generating filtered PDF report:", error);
    }
  }

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


    const startDate = formData.get("start_date")?.toString();

    if (startDate) {
      const selectedDate = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        alert("NDOH Date cannot be in the future.");
        return;
      }
    }


    const endDate = formData.get("end_date")?.toString();

    if (endDate) {
      const selectedDate = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Strip time portion for accurate comparison

      if (selectedDate > today) {
        alert("End Date cannot be in the future.");
        return;
      }
    }


    handleFilteredCasesReportPDF(formData, startDate || "", endDate || "")
    

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
          <SelectField
            id="natureOfCase"
            label="Nature of Case"
            options={natureOfCaseOptions}
          />
          <SelectField
            id="assignedTo"
            label="Assigned To"
            options={assignedToOptions}
          />

          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>


          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Generate Report
          </button>
        </form>
      </div>
    </div>
  );
};

export default GenerateSpecificReportForm;
