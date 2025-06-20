import React, { useEffect, useState } from "react";
import { CirclePlus, PenLine, BookText, FileClock } from "lucide-react";
import InitialForm from "../forms/addCase";
import GenerateSpecificReportForm from "../forms/generateSpecificReport";
import CaseUpdateForm from "../forms/updateCaseStatus";
import { invoke } from "@tauri-apps/api/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 

const InitialPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState("");
  const [openModal, setOpenModal] = useState<null | string>(null); 

  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
    setCurrentDate(`${day}.${month}.${year} (${weekday})`);
  }, []);

  const ButtonCard = ({
    icon,
    title,
    description,
    buttonText,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonText: string;
  }) => (
    <div className="bg-slate-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 max-w-full flex justify-center items-center">
      <div className="flex flex-col items-center text-center">
        <span className={`material-icons text-5xl mb-3`}>
          {icon}
        </span>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-600 text-sm mb-4">{description}</p>
        <button onClick={()=>{
          setOpenModal(title.toLowerCase().replace(/\s+/g, ''));
        }}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );


async function handleGenerateReportPDF() {
  try {
    const result = await invoke("get_todays_cases") as Array<any>;

    if (!result.length) {
      console.warn("No cases to export.");
      return;
    }

    const sanitize = (text: any) =>
    String(text ?? "").replace(/_/g, " ");

    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("Today's Case Report", 14, 20);

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

    const rows = result.map((c) => [
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

    doc.save("case_report.pdf");
  } catch (error) {
    console.error("Error generating PDF report:", error);
  }
}


  return (
    <div className="bg-slate-100 min-h-screen min-w-screen font-roboto">
      <div className="container mx-auto p-4 md:p-8 flex">

        <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
          <div className="mb-8 text-center">
            <p className="text-xl font-semibold text-slate-700">
              Delhi Mediation Centre, Rohini Courts, Delhi
            </p>
            <div className="flex justify-center items-center mt-4 ">
              <img src="handshake.jpg" alt="Handshake" width={100} height={100}/>
            </div>
            <p className="text-lg font-medium text-slate-700 mt-2">
              Today's Date:{" "}
              <span className="font-bold text-blue-600">{currentDate}</span>
            </p>
          </div>
                <InitialForm
                  isOpen={openModal === 'addcase'}
                  onClose={() => setOpenModal(null)}
                  title="Add Case"
                  formId="form1"
                />
                <GenerateSpecificReportForm
                  isOpen={openModal === 'generatespecificreport'}
                  onClose={() => setOpenModal(null)}
                  title="Generate Specific Report"
                  formId="form2"
                />
                <CaseUpdateForm
                  isOpen={openModal === 'updatecasestatus'}
                  onClose={() => setOpenModal(null)}
                  title="Update Case Status"
                  formId="form3"
                />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ButtonCard
              icon={<CirclePlus color="blue" />}
              title="Add Case"
              description=""
              buttonText="Go to Form"
            />
            <ButtonCard
              icon={<PenLine color="blue" />}
              title="Update Case Status"
              description=""
              buttonText="Update Status"
            />
            <div className="bg-slate-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 max-w-full flex justify-center items-center">
              <div className="flex flex-col items-center text-center">
                <span className={`material-icons text-5xl mb-3`}>
                  <BookText color="blue" />
                </span>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Generate Report</h2>
                <p className="text-slate-600 text-sm mb-4">Provides Summary For The Current Day</p>
                <button onClick={handleGenerateReportPDF}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center`}
                >
                  Generate Report
                </button>
              </div>
            </div>
            <div className="col-span-3">
              <ButtonCard
                icon={<FileClock color="blue" />}
                title="Generate Specific Report"
                description="Generate a custom Report."
                buttonText="Generate Report"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialPage;



