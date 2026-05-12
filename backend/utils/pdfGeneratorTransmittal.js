const PDFDocument = require('pdfkit');

/**
 * Generate a Document Transmittal PDF as a Buffer using pdfkit.
 * Returns a Buffer containing the PDF data.
 * 
 * @param {Object} transmission - The transmission details (number, date, etc.)
 * @param {Object} customer - The client company details (name)
 * @param {Object} location - The client location/address details
 * @param {Object} po - The PO details
 * @param {Array} documents - List of documents with Sr.No, Doc Number, Rev, Title
 * @param {Object} creator - User who created the transmission (name, designation, department)
 * @returns {Promise<Buffer>}
 */
function generateTransmittalPDF(transmission, customer, location, po, documents, creator) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', (err) => {
                reject(err);
            });

            // --- Colors and Fonts ---
            const primaryColor = '#0056b3'; // Blue color as per client request
            const textColor = '#0056b3'; // Using blue instead of red

            // --- Header Title ---
            doc.fillColor(primaryColor)
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('Document Transmittal', { align: 'center', underline: true });
            doc.moveDown(1.5);

            // --- Top Right Details ---
            doc.fontSize(10)
                .font('Helvetica')
                .text(`Transmittal No.: ${transmission?.transmission_number || 'N/A'}`, { align: 'right' });
            doc.moveDown(0.5);

            // Format date correctly
            const dateStr = transmission?.createdAt ? new Date(transmission.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            doc.text(`Date: ${dateStr}`, { align: 'right' });
            doc.moveDown(2);

            // --- From and To Columns ---
            const startY = doc.y;

            // From Column (Left)
            doc.text('From:', 50, startY);
            doc.font('Helvetica-Bold').text('Shreno Engineering Limited', 50, startY + 15);
            doc.font('Helvetica').text('Block No. 518/519/520/530, Village ASOJ,', 50, startY + 30);
            doc.text('Waghodia, Vadodara, Gujarat 391510.', 50, startY + 45);

            // To Column (Right)
            doc.text('To,', 300, startY);
            doc.text(customer?.customer_name || '__________________________', 300, startY + 15);
            doc.text(location?.location_name || '__________________________', 300, startY + 30);
            const gstOrAddress = location?.gst_number ? `GST: ${location.gst_number}` : '__________________________';
            doc.text(gstOrAddress, 300, startY + 45);

            doc.moveDown(3);

            // --- Subject ---
            const subjectLineY = doc.y + 20;
            doc.text(`Subject: PO No. ${po?.po_number || '___________'} document submission for review/approval.`, 50, subjectLineY, { align: 'center' });

            doc.moveDown(2);

            // --- Salutation ---
            doc.text('Dear Sir,', 50, doc.y);
            doc.moveDown(1);
            doc.text('We are sharing with you below list of documents that have been submitted for your review/approval.', 50, doc.y);
            doc.moveDown(1.5);

            // --- Table Rendering ---
            const startTableY = doc.y;
            const rowHeight = 25;
            let currentY = startTableY;

            // Table Columns setup (A4 width is 595, margins 50 each => 495 usable width)
            // Updated columns: Sr No (30), Shreno (115), Client (115), Doc Name (185), Rev (50)
            const colWidths = [30, 115, 115, 185, 50]; 
            const colX = [
                50,
                50 + colWidths[0],
                50 + colWidths[0] + colWidths[1],
                50 + colWidths[0] + colWidths[1] + colWidths[2],
                50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
            ];

            // Helper to draw cells
            const drawRow = (y, texts, isHeader = false) => {
                doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
                doc.fillColor(primaryColor);

                // Draw cells
                for (let i = 0; i < texts.length; i++) {
                    doc.rect(colX[i], y, colWidths[i], rowHeight).stroke();

                    let align = 'center';
                    // Align Doc Numbers and Names left, others center
                    if (i === 1 || i === 2 || i === 3) align = 'left'; 
                    if (isHeader) align = 'center'; 

                    // Add safe horizontal padding (5pt on each side) to prevent border overlap
                    const padX = 5;
                    const textWidth = colWidths[i] - (padX * 2);
                    const textX = colX[i] + padX;

                    // Compute actual text height to center it vertically within the cell
                    const totalTextHeight = doc.heightOfString(texts[i], { width: textWidth, align: align });
                    const verticalOffset = (rowHeight - totalTextHeight) / 2;

                    doc.text(texts[i], textX, y + verticalOffset, {
                        width: textWidth,
                        align: align
                    });
                }
            };

            // Draw Header (Updated Labels)
            drawRow(currentY, ['Sr. No.', 'Shreno Doc No', 'Client Doc No', 'Doc Name', 'Rev'], true);
            currentY += rowHeight;

            // Determine versions to list
            let docsToList = (documents || []).filter(d => d.group_document);

            // Draw Data Rows
            docsToList.forEach((docItem, index) => {
                // If we reach bottom of page, add new page
                if (currentY + rowHeight > doc.page.height - 100) {
                    doc.addPage();
                    currentY = 50; // Reset Y for new page
                    // Redraw header on new page
                    drawRow(currentY, ['Sr. No.', 'Shreno Doc No', 'Client Doc No', 'Doc Name', 'Rev'], true);
                    currentY += rowHeight;
                }

                const srNo = (index + 1).toString();
                
                // Map fields correctly as per user request
                let shrenoDocNo = docItem.group_document?.shreno_doc_no || '';
                let clientDocNo = docItem.group_document?.client_doc_no || '';
                let docName = docItem.group_document?.document?.document_name || '';
                let rev = docItem.display_version_no || (docItem.version ? (docItem.version.version_no !== undefined ? docItem.version.version_no.toString() : '') : '');

                drawRow(currentY, [srNo, shrenoDocNo, clientDocNo, docName, rev]);
                currentY += rowHeight;
            });

            doc.moveDown(3);

            // --- Footer / Signatory ---
            // If we ran out of space for footer, add new page
            if (doc.y + 100 > doc.page.height - 50) {
                doc.addPage();
            } else {
                doc.y = currentY + 40;
            }

            doc.font('Helvetica');
            doc.text('Regards,', 50, doc.y);
            doc.moveDown(0.5);
            doc.text(creator?.name || '________________', 50, doc.y);
            doc.text(`${creator?.designation || 'Sr.Executive'},`, 50, doc.y);
            doc.text('Project Planning Document Controller', 50, doc.y);
            doc.text('Shreno Engineering Limited.', 50, doc.y);

            // Finalize PDF
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generateTransmittalPDF
};
