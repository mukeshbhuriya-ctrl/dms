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
            const doc = new PDFDocument({ margins: { top: 25, bottom: 25, left: 25, right: 25 }, size: 'A4' });
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
            const textColor = '#0056b3'; 

            // --- Header Title ---
            doc.fillColor(primaryColor)
                .fontSize(14)
                .font('Helvetica-Bold')
                .text('Document Transmittal', { align: 'center' });
            
            // Reduced spacing
            doc.moveDown(0.2);

            // --- Top Right Details ---
            doc.fontSize(9)
                .font('Helvetica')
                .text(`Transmittal No.: ${transmission?.transmission_number || 'N/A'}`, { align: 'right' });

            // Format date correctly
            const dateStr = transmission?.createdAt ? new Date(transmission.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            doc.text(`Date: ${dateStr}`, { align: 'right' });
            doc.moveDown(0.5);

            // --- From and To Columns ---
            const startY = doc.y;
            let currentLeftY = startY;
            let currentRightY = startY;
            const leftX = 25;
            const rightX = 320;
            const colW = 250;

            // From Column (Left)
            doc.fontSize(9);
            doc.text('From:', leftX, currentLeftY, { width: colW });
            currentLeftY = doc.y;
            doc.font('Helvetica-Bold').text('Shreno Engineering Limited', leftX, currentLeftY, { width: colW });
            currentLeftY = doc.y;
            doc.font('Helvetica').text('Block No. 518/519/520/530, Village ASOJ,', leftX, currentLeftY, { width: colW });
            currentLeftY = doc.y;
            doc.text('Waghodia, Vadodara, Gujarat 391510.', leftX, currentLeftY, { width: colW });
            currentLeftY = doc.y;

            // To Column (Right)
            doc.text('To,', rightX, currentRightY, { width: colW });
            currentRightY = doc.y;
            doc.text(customer?.customer_name || '__________________________', rightX, currentRightY, { width: colW });
            currentRightY = doc.y;
            doc.text(location?.location_name || '__________________________', rightX, currentRightY, { width: colW });
            currentRightY = doc.y;
            const gstOrAddress = location?.gst_number ? `GST: ${location.gst_number}` : '__________________________';
            doc.text(gstOrAddress, rightX, currentRightY, { width: colW });
            currentRightY = doc.y;

            // Move to below whichever column is longer, with tight padding
            doc.y = Math.max(currentLeftY, currentRightY) + 10;

            // --- Subject ---
            doc.fontSize(9).text(`Subject: PO No. ${po?.po_number || '___________'} document submission for review/approval.`, 25, doc.y, { align: 'center', width: 545 });

            doc.moveDown(0.5);

            // --- Salutation ---
            doc.text('Dear Sir,', 25, doc.y);
            doc.moveDown(0.2);
            doc.text('We are sharing with you below list of documents that have been submitted for your review/approval.', 25, doc.y);
            doc.moveDown(0.5);

            // --- Table Rendering ---
            const startTableY = doc.y;
            let currentY = startTableY;

            // Table Columns setup (A4 width is 595, margins 25 each => 545 usable width)
            // Updated columns: Sr No (30), Shreno (130), Client (130), Doc Name (215), Rev (40)
            const colWidths = [30, 130, 130, 215, 40]; 
            const colX = [
                25,
                25 + colWidths[0],
                25 + colWidths[0] + colWidths[1],
                25 + colWidths[0] + colWidths[1] + colWidths[2],
                25 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
            ];

            // Helper to calculate row height dynamically
            const padX = 4;
            const calculateRowHeight = (texts, font) => {
                let maxHeight = 0;
                doc.font(font).fontSize(9);
                for (let i = 0; i < texts.length; i++) {
                    const textWidth = colWidths[i] - (padX * 2);
                    const textHeight = doc.heightOfString(texts[i] || '', { width: textWidth });
                    if (textHeight > maxHeight) maxHeight = textHeight;
                }
                return maxHeight + 6; // 3pt padding top and bottom
            };

            // Helper to draw cells
            const drawRow = (y, texts, rowHeight, isHeader = false) => {
                doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
                doc.fillColor(primaryColor);

                // Draw cells
                for (let i = 0; i < texts.length; i++) {
                    doc.rect(colX[i], y, colWidths[i], rowHeight).strokeColor(primaryColor).lineWidth(1).stroke();

                    let align = 'center';
                    // Align Doc Numbers and Names left, others center
                    if (i === 1 || i === 2 || i === 3) align = 'left'; 
                    if (isHeader) align = 'center'; 

                    const textWidth = colWidths[i] - (padX * 2);
                    const textX = colX[i] + padX;

                    // Compute actual text height to center it vertically within the cell
                    const totalTextHeight = doc.heightOfString(texts[i] || '', { width: textWidth, align: align });
                    const verticalOffset = (rowHeight - totalTextHeight) / 2;

                    doc.text(texts[i] || '', textX, y + verticalOffset, {
                        width: textWidth,
                        align: align
                    });
                }
            };

            // Draw Header (Updated Labels)
            const headerTexts = ['Sr. No.', 'Shreno Document No', 'Client Document No', 'Document Name', 'Rev'];
            let headerHeight = calculateRowHeight(headerTexts, 'Helvetica-Bold');
            drawRow(currentY, headerTexts, headerHeight, true);
            currentY += headerHeight;

            // Determine versions to list
            let docsToList = (documents || []).filter(d => d.group_document);

            // Draw Data Rows
            docsToList.forEach((docItem, index) => {
                const srNo = (index + 1).toString();
                let shrenoDocNo = docItem.group_document?.shreno_doc_no || '-';
                let clientDocNo = docItem.group_document?.client_doc_no || '-';
                let docName = docItem.group_document?.document?.document_name || '-';
                let rev = docItem.display_version_no || (docItem.version && docItem.version.version_no !== undefined ? docItem.version.version_no.toString() : '-');

                const rowTexts = [srNo, shrenoDocNo, clientDocNo, docName, rev];
                const rowHeight = calculateRowHeight(rowTexts, 'Helvetica');

                // If we reach bottom of page, add new page intelligently
                if (currentY + rowHeight > doc.page.height - 35) {
                    doc.addPage();
                    currentY = 30; // Reset Y for new page
                    // Redraw header on new page
                    drawRow(currentY, headerTexts, headerHeight, true);
                    currentY += headerHeight;
                }

                drawRow(currentY, rowTexts, rowHeight, false);
                currentY += rowHeight;
            });

            // --- Footer / Signatory ---
            // If we ran out of space for footer, add new page
            if (currentY + 60 > doc.page.height - 35) {
                doc.addPage();
                doc.y = 30;
            } else {
                doc.y = currentY + 20;
            }

            doc.font('Helvetica').fontSize(9);
            doc.text('Regards,', 25, doc.y);
            doc.moveDown(0.2);
            doc.text(creator?.name || '________________', 25, doc.y);
            doc.text(`${creator?.designation || 'Sr.Executive'},`, 25, doc.y);
            doc.text('Project Planning Document Controller', 25, doc.y);
            doc.text('Shreno Engineering Limited.', 25, doc.y);

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
