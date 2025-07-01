import React, { useEffect, useState } from "react";
import { CircleX,ChevronDown } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { NatureOfCase } from "../types/case";
interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formId: string;
}
import { useAssignedTo } from "../lib/assignedContext";

// Assumes SelectField is defined and imported correctly
// Example:
// import { SelectField } from "./SelectField";

const InitialForm: React.FC<ModalFormProps> = ({ isOpen, onClose, title, formId }) => {
  const [currentDate, setCurrentDate] = useState("");
  const [currentDay, setCurrentDay] = useState("");
    const { options, loading } = useAssignedTo();
  
    

    const natureOfCaseOptions = Object.values(NatureOfCase).map((option) => ({
    value: option,
    label: option.replace(/([a-z])([A-Z])/g, "$1 $2"), // adds space between camel-case words
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

  if (loading) {
      return <p>Loading...</p>;
    }
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = e.currentTarget;
  const formData = new FormData(form);

  const caseNoStr = formData.get("case-no");
  const yearStr = formData.get("year");

  const caseNo = caseNoStr ? parseInt(caseNoStr.toString(), 10) : null;
  const year = yearStr ? parseInt(yearStr.toString(), 10) : null;

  if (caseNo === null || isNaN(caseNo)) {
    console.error("Invalid case number");
    return;
  }

  if (year === null || isNaN(year)) {
    console.error("Invalid year");
    return;
  }

  invoke("insert_case", {
    payload: {
      case_no: caseNo,
      year: year, // 👈 use the user-input year
      nature_of_case: formData.get("nature-of-case") || "",
      received_from: formData.get("received-from") || "",
      time_slot: formData.get("time-of-assignment") || "",
      party1: formData.get("party1") || "",
      party2: formData.get("party2") || "",
      assigned_to: formData.get("assigned-to") || "",
    },
  })
    .then(() => {
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
            <div className="flex space-x-4">
              <div className="flex-1">
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

              <div className="flex-1">
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="text"
                  id="year"
                  name="year"
                  placeholder="Enter year"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm"
                  pattern="\d{4}"
                  maxLength={4}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>


            <SelectField id="nature-of-case" label="Nature of Case" options={natureOfCaseOptions} />
            <SelectField
              id="received-from"
              label="Received From"
              options={[
                "Annexure A",
                "Caw Cell(N)",
                "CAW Cell(OD)",
                "DLSA",
                "Gurvinder Pal Singh, Pr. District & Sessions Judge, North West",
                "Preeti Agrawal Gupta, District Judge (Commercial Court-01), North West",
                "Vinod Yadav, District Judge (Commercial Court-02), North West",
                "Kapil Kumar, ASJ, (Spl. FTC) North West",
                "Neeti Suri Mishra, ASJ, (FTSC) POCSO North West",
                "Prashant Kumar, ASJ, (Electricity) North West",
                "Rajani Ranga ASJ-01, (POCSO) North West",
                "Shivaji Anand, ASJ, (Spl. Judge, NDPS, SC/ST) North West",
                "Muneesh Garg, ASJ-03, North West",
                "Jasjeet Kaur, ASJ-04 (POCSO), North West",
                "Rajinder Kumar, ASJ-05, North West",
                "Vikram, District Judge-01/ MACT, North West",
                "Rakesh Kumar Singh, District Judge-02, North West",
                "Ashish Aggarwal, District Judge-03, North West",
                "Sunil Chaudhary, District Judge-04, North West",
                "Shama Gupta, PO, (MACT) North West",
                "Anuj Kumar Singh, Sr. Civil Judge, North West",
                "Mansi Malik, ACJ/CCJ/ARC, North West",
                "Gaurav Sharma, JSCC/ASCJ/GJ, North West",
                "Arjun Kirar, CJ, North West",
                "Vasundhra Chhaunkar, CJM, North West",
                "Vivek Beniwal, ACJM, North West",
                "Abhinav Singh, JMFC-01, North West",
                "Apoorv Bhardwaj, JMFC-02, North West",
                "Ebbani Aggarwal, JMFC-03, North West",
                "Divya Arora, JMFC-04, North West",
                "Reetika Jain, JMFC-05, North West",
                "Shagun, JMFC-06, North West",
                "Gaurav Katariya, JMFC-07, North West",
                "Aishwarya Sharma, JMFC(Mahila Court-1), North West",
                "Neha Goel, JMFC(Mahila Court-2), North West",
                "Nitika, JMFC (NIA), North West",
                "Surbhi Sharma, JMFC (NIA), Digital Court-01, North West",
                "Surbhi Sharma, JMFC (NIA), Digital Court-02, North West",
                "Shraddha Tripathi, JMFC (NIA), Digital Court-03, North West",
                "Kashish Bajaj, JMFC (Digital Traffic Court), North West",
                "Gaurav Singal, Reliever Judge DLSA, North West",
                "Dinesh Bhatt, Pr. Judge, Family Court, North West",
                "Hemraj, Judge, Family Court, North West",
                "Anju Bajaj Chandna, Pr. District & Sessions Judge, North",
                "Anil Kumar, District Judge (Commercial Court-01), North",
                "Umed Singh, District Judge (Commercial Court-02), North",
                "Dhirendra Rana, ASJ, Spl. Judge (NDPS) North",
                "Ajay Nagar, ASJ, (FTSC) POCSO North",
                "Anil Sehrawat, ASJ-01, (POCSO. FTC) North",
                "Vandana, ASJ-02, North",
                "Jagmohan Singh, ASJ-03 (Pilot Court), North",
                "Sushil Kumar, ASJ-04, North",
                "Pooja Jain, ASJ-05 (POCSO), North",
                "Sidharth Mathur, District Judge-01/ LAC, North",
                "Vikram Bali, District Judge-02, North",
                "Aanchal, District Judge-03, North",
                "Ravinder Singh-2, District Judge-04, North",
                "Sunil Kumar, PO, (MACT-1) North",
                "Richa Manchanda, PO, (MACT-2) North",
                "Himanshu Raman Singh, Sr. Civil Judge/RC, North",
                "Ajay Singh Parihar, ACJ/CCJ/ARC, North",
                "Nitish Kumar Sharma, JSCC/ASCJ/GJ, North",
                "Renu, CJ, North",
                "Amardeep Kaur, ACJM, North",
                "Bhujali, JMFC-01, North",
                "Neha Kheria, JMFC-02, North",
                "Himanshu Sehloth, JMFC-03, North",
                "Rohit Kumar, JMFC-04, North",
                "Sarthak Panwar, JMFC-05, North",
                "Garima Jindal, JMFC-06, North",
                "Jyoti Nain, JMFC-07, North",
                "Sanya Dalal, JMFC(Mahila Court-1), North",
                "Disha Singh, JMFC(Mahila Court-2), North",
                "Gaurav Dahiya, JMFC (NIA), Digital Court-01, North",
                "Priyanka, JMFC (NIA), Digital Court-02, North",
                "Shreejee Abbot, JMFC (Digital Traffic Court), North",
                "DLSA, North",
                "Pankaj Gupta, Pr. Judge, Family Court, North",
                "Neeraj Gaur, Judge, Family Court, North"
              ]}
            />

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

            <SelectField id="assigned-to" label="Assigned To" options={options} />

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
