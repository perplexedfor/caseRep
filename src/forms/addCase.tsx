import React, { useEffect, useState } from "react";
import { CircleX,ChevronDown } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { NatureOfCase, AssignedTo } from "../types/case";
interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formId: string;
}

// Assumes SelectField is defined and imported correctly
// Example:
// import { SelectField } from "./SelectField";


const InitialForm: React.FC<ModalFormProps> = ({ isOpen, onClose, title, formId }) => {
  const [currentDate, setCurrentDate] = useState("");
  const [currentDay, setCurrentDay] = useState("");

  const natureOfCaseOptions = Object.values(NatureOfCase).map((option) => ({
  value: option,
  label: option.replace(/([a-z])([A-Z])/g, "$1 $2"), // adds space between camel-case words
  }));

  const assignedToOptions = Object.values(AssignedTo).map((option) => ({
  value: option,
  label: option.replace(/_/g, " "),
  }));

  useEffect(() => {
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
    const dayOptions: Intl.DateTimeFormatOptions = { weekday: "long" };
    const dateStr = now.toLocaleDateString(undefined, dateOptions);
    const dayStr = now.toLocaleDateString(undefined, dayOptions);
    setCurrentDate(dateStr);
    setCurrentDay(dayStr);
  }, []);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const caseNoStr = formData.get("case-no");
    const caseNo = caseNoStr ? parseInt(caseNoStr.toString(), 10) : null;

    if (caseNo === null || isNaN(caseNo)) {
      console.error("Invalid case number");
      return;
    }

    invoke("insert_case", {payload : {
      case_no: caseNo,
      nature_of_case: formData.get("nature-of-case") ? formData.get("nature-of-case") : "",
      received_from: formData.get("received-from") ? formData.get("received-from") : "",
      time_slot: formData.get("time-of-assignment") ? formData.get("time-of-assignment") : "",
      party1: formData.get("party1") ? formData.get("party1") : "",
      party2: formData.get("party2") ? formData.get("party2") : "",
      assigned_to: formData.get("assigned-to") ? formData.get("assigned-to") : "",
    }}).then(() => {
        console.log("Case added successfully");
      })
      .catch((error) => {
        console.error("Error adding case:", error);
      });

    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    form.reset();
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
      <div
        style={{
          background: "white",
          padding: "1rem",
          width: "75%",
          borderRadius: "0.5rem",
        }}
      >
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

        <div className="mx-auto bg-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
            <div className="text-right">
              <p className="text-lg text-gray-600">{currentDate}</p>
              <p className="text-lg text-gray-600">{currentDay}</p>
            </div>
          </div>

          <form id={formId} className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="case-no" className="block text-sm font-medium text-gray-700 mb-1">
                Case No.
              </label>
              <input
                type="text"
                id="case-no"
                name="case-no"
                placeholder="Enter case number"
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
                pattern="\d{6}"  
                maxLength={6}        
                inputMode="numeric"    
                required
              />
            </div>

            <SelectField id="nature-of-case" label="Nature of Case" options={natureOfCaseOptions} />
            <SelectField id="received-from" label="Received From" options={["Annexure A","Caw Cell(N)","CAW Cell(OD)","DLSA"]} />
            <SelectField
              id="time-of-assignment"
              label="Time of Assignment"
              options={[
                "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
                "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
                "16:00", "16:30", "17:00",
              ]}
            />

            <div className="flex justify-between">
              <div className="w-1/2 pr-2">
                <label htmlFor="party1" className="block text-sm font-medium text-gray-700 mb-1">
                  Party 1
                </label>
                <input
                  type="text"
                  id="party1"
                  name="party1"
                  placeholder="Enter party 1 name"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="w-1/2 pl-2">
                <label htmlFor="party2" className="block text-sm font-medium text-gray-700 mb-1">
                  Party 2
                </label>
                <input
                  type="text"
                  id="party2"
                  name="party2"
                  placeholder="Enter party 2 name"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <SelectField id="assigned-to" label="Assigned To" options={assignedToOptions} />

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Submit Case
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};



// const InitialForm: React.FC = () => {
//   const [currentDate, setCurrentDate] = useState("");
//   const [currentDay, setCurrentDay] = useState("");

//   useEffect(() => {
//     const now = new Date();
//     const dateOptions: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
//     const dayOptions: Intl.DateTimeFormatOptions = { weekday: "long" };
//     setCurrentDate(now.toLocaleDateString(undefined, dateOptions));
//     setCurrentDay(now.toLocaleDateString(undefined, dayOptions));
//   }, []);

//   return (
//     <div className="bg-gray-100 p-8 min-h-screen">
//       <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
//         <div className="flex justify-between items-center mb-8">
//           <h1 className="text-3xl font-bold text-gray-800">Initial Form (Add New Case)</h1>
//           <div className="text-right">
//             <p className="text-lg text-gray-600">{currentDate}</p>
//             <p className="text-lg text-gray-600">{currentDay}</p>
//           </div>
//         </div>

//         <form className="space-y-6">
//           <div>
//             <label htmlFor="case-no" className="block text-sm font-medium text-gray-700 mb-1">
//               Case No.
//             </label>
//             <input
//               type="text"
//               id="case-no"
//               name="case-no"
//               maxLength={6}
//               placeholder="Enter case number"
//               className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//             />
//           </div>

//           <SelectField id="nature-of-case" label="Nature of Case" options={["Type 1", "Type 2", "Type 3"]} />
//           <SelectField id="received-from" label="Received From" options={["Source A", "Source B", "Source C"]} />
//           <SelectField
//             id="time-of-assignment"
//             label="Time of Assignment"
//             options={[
//               "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
//               "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
//               "16:00", "16:30", "17:00"
//             ]}
//           />
//           <SelectField id="assigned-to" label="Assigned To" options={["User 1", "User 2", "User 3"]} />

//           <div className="pt-5">
//             <button
//               type="submit"
//               className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//             >
//               Submit Case
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

type OptionType = string | { value: string; label: string };

export const SelectField: React.FC<{ id: string; label: string; options: OptionType[] }> = ({ id, label, options }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          defaultValue=""
          className="appearance-none mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
        >
          <option disabled value="">
            Select {label.toLowerCase()}
          </option>
          {options.map((opt, idx) =>
            typeof opt === "string" ? (
              <option key={idx} value={opt.toLowerCase().replace(/\s+/g, "")}>
                {opt}
              </option>
            ) : (
              <option key={idx} value={opt.value}>
                {opt.label}
              </option>
            )
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
          <span className="material-icons"><ChevronDown/></span>
        </div>
      </div>
    </div>
  );
};

export default InitialForm;
