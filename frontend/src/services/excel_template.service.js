import * as XLSX from 'xlsx';

/**
 * Generates and downloads the standard document assignment Excel template.
 * Includes column headers and sample data for the user.
 */
export const downloadAssignmentTemplate = () => {
    // 1. Define Column Headers
    const headers = [
        "Job Number",
        "Document Name",
        "Employee ID",
        "Shreno Document No",
        "Client Document No",
        "Upload Due Days",
        "Response Due Days"
    ];

    // 2. Define Sample Data (Instructions included as first row)
    const sampleData = [
        ["101010232", "General Arrangement Drawing", "87", "605699", "695659", "7", "14"],
        ["909940", "Quality Control Plan", "12", "5695693", "59659569", "5", "10"],
        ["564565460", "Weld Map", "44", "469459054", "6765969", "10", "21"]
    ];

    // 3. Combine Headers and Data
    const data = [headers, ...sampleData];

    // 4. Create Workbook and Worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 5. Add Worksheet to Workbook
    XLSX.utils.book_append_sheet(wb, ws, "Assignment Template");

    // 6. Write and Download
    XLSX.writeFile(wb, "Document_Assignment_Template.xlsx");
};
