const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000', // Bright red as per screenshot
            black: '#000000',
            darkBlue: '#000080',
            white: '#FFFFFF'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    /**
     * Generates a single PDF with multiple pages, one for each stage provided.
     * @param {Object} allStagesData - Keys are 'stage1', 'stage2', etc., values are the report data for that stage.
     * @param {Object} res - Express response object
     */
    generateCompleteReport(allStagesData, res) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const stages = Object.keys(allStagesData).sort();

        stages.forEach((stage, index) => {
            if (index > 0) doc.addPage();

            const data = allStagesData[stage];

            if (stage === 'stage1') {
                if (data.categoryKey === 'cd' || (data.jointType && ['C', 'D'].includes(data.jointType))) {
                    this.drawStage1_CD(doc, data);
                } else if (data.categoryKey === 'f' || (data.jointType && ['F'].includes(data.jointType))) {
                    this.drawStage1_F(doc, data);
                } else {
                    this.drawStage1(doc, data); // A/B Default
                }
            } else {
                this.drawStandardStage(doc, data, stage);
            }
        });

        doc.end();
    }

    /**
     * Generates a single page report for Stage 1 (Backwards compatibility)
     */
    generateStage1Report(data, res) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        if (data.categoryKey === 'cd' || (data.jointType && ['C', 'D'].includes(data.jointType))) {
            this.drawStage1_CD(doc, data);
        } else if (data.categoryKey === 'f' || (data.jointType && ['F'].includes(data.jointType))) {
            this.drawStage1_F(doc, data);
        } else {
            this.drawStage1(doc, data);
        }

        doc.end();
    }

    // ==========================================
    // STAGE 1 LAYOUT (Exact Replica)
    // ==========================================
    // ==========================================
    // STAGE 1 LAYOUT (Category A/B - Exact Replica)
    // ==========================================
    drawStage1(doc, data) {
        // ... (Existing Logic for A/B)
        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();

        let currentY = startY + 5;
        const innerW = pageW - 10;
        const innerX = startX + 5;

        currentY = this.drawHeader(doc, innerX, currentY, innerW, data, 'SET UP & WELD VISUAL INSPECTION REPORT');
        currentY = this.drawInfoGrid(doc, innerX, currentY, innerW, data);

        const footerH = 130;
        const footerStartY = (startY + pageH) - footerH - 5;

        // Inspection Table
        const tableTitle = 'LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT';
        this.drawInspectionTable(doc, innerX, currentY, innerW, data, footerStartY, tableTitle);

        this.drawFooter(doc, innerX, footerStartY, innerW, data, 'Set Up Inspection by');
    }

    // ==========================================
    // STAGE 1 LAYOUT (Category C/D)
    // ==========================================
    drawStage1_CD(doc, data) {
        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();

        let currentY = startY + 5;
        const innerW = pageW - 10;
        const innerX = startX + 5;

        currentY = this.drawHeader(doc, innerX, currentY, innerW, data, 'MATERIAL IDENTIFICATION & SET UP REPORT');
        currentY = this.drawInfoGrid(doc, innerX, currentY, innerW, data);

        const footerH = 130;
        const footerStartY = (startY + pageH) - footerH - 5;

        // C/D Specific Content Area
        this.drawStage1_CD_Content(doc, innerX, currentY, innerW, data, footerStartY);

        this.drawFooter(doc, innerX, footerStartY, innerW, data, 'Set Up Inspection by');
    }

    drawStage1_CD_Content(doc, x, y, width, data, bottomY) {
        let curY = y + 10;
        const rowH = 30;

        // Section I: Material Identification
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.black)
            .text('I. Material Identification', x, curY);
        curY += 20;

        // Grid 1
        const fields1 = [
            { l: 'Characteristics Checked:', v: data.jointNo },
            { l: 'Nozzle Number:', v: data.nozzleNumber },
            { l: 'Material ID Marks:', v: data.materialIdMarks }
        ];
        curY = this.drawFieldRow(doc, x, curY, width, rowH, fields1);

        curY += 15;

        // Section II: Set Up
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.black)
            .text('II. Set Up', x, curY);
        curY += 20;

        // Grid 2
        const fields2 = [
            { l: 'Tack Welder:', v: data.tackWelder },
            { l: 'Visual Inspection:', v: data.visualInspection },
            { l: 'L-Seam RT:', v: data.lSeamRt }
        ];
        curY = this.drawFieldRow(doc, x, curY, width, rowH, fields2);

        curY += 15;

        // Dimension Box
        doc.rect(x, curY, width, 50).stroke();
        doc.font(this.fonts.bold).fontSize(10).text('Dimensions:', x + 5, curY + 5);

        const dimY = curY + 20;
        const fields3 = [
            { l: 'Nozzle Size:', v: data.nozzleSize },
            { l: 'Total Length:', v: data.totalLength }
        ];
        this.drawFieldRow(doc, x, dimY, width, rowH, fields3);
    }

    // ==========================================
    // STAGE 1 LAYOUT (Category F)
    // ==========================================
    drawStage1_F(doc, data) {
        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();

        let currentY = startY + 5;
        const innerW = pageW - 10;
        const innerX = startX + 5;

        currentY = this.drawHeader(doc, innerX, currentY, innerW, data, 'STAGE 1: SET UP REPORT');
        currentY = this.drawInfoGrid(doc, innerX, currentY, innerW, data);

        const footerH = 130;
        const footerStartY = (startY + pageH) - footerH - 5;

        // F Specific Content Area
        this.drawStage1_F_Content(doc, innerX, currentY, innerW, data, footerStartY);

        this.drawFooter(doc, innerX, footerStartY, innerW, data, 'Set Up Inspection by');
    }

    drawStage1_F_Content(doc, x, y, width, data, bottomY) {
        let curY = y + 20;
        const rowH = 35;

        const fields = [
            { l: 'Characteristics Checked:', v: data.jointNo },
            { l: 'Material ID Marks:', v: data.materialIdMarks },
            { l: 'Tack Welder:', v: data.tackWelder }
        ];

        // Draw as a vertical list or grid? F form shows simple fields.
        // Let's do a vertical list with boxes
        fields.forEach(f => {
            doc.rect(x, curY, width * 0.4, rowH).stroke();
            doc.rect(x + width * 0.4, curY, width * 0.6, rowH).stroke();

            doc.font(this.fonts.bold).fillColor(this.colors.red).text(f.l, x + 5, curY + 10);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(f.v || '-', x + width * 0.4 + 5, curY + 10);

            curY += rowH;
        });
    }

    // Helper for C/D Grids
    drawFieldRow(doc, x, y, width, height, fields) {
        const count = fields.length;
        const w = width / count;

        fields.forEach((f, i) => {
            const bx = x + i * w;
            doc.rect(bx, y, w, height).stroke();

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(9)
                .text(f.l, bx + 2, y + 2, { width: w - 4 });

            doc.font(this.fonts.regular).fillColor(this.colors.black).fontSize(10)
                .text(f.v || '-', bx + 2, y + 16, { width: w - 4 });
        });
        return y + height;
    }

    // ==========================================
    // STANDARD STAGE LAYOUT (Stage 2-8)
    // ==========================================
    drawStandardStage(doc, data, stageKey) {
        const stageNum = stageKey.replace('stage', '');
        const titleMap = {
            '2': 'BACK CHIP INSPECTION REPORT',
            '3': 'WELD VISUAL INSPECTION REPORT',
            '4': 'RADIOGRAPHY TESTING REPORT',
            '5': 'DYE PENETRANT TESTING REPORT',
            '6': 'POST WELD HEAT TREATMENT REPORT',
            '7': 'HARDNESS TEST REPORT',
            '8': 'FINAL INSPECTION REPORT'
        };
        const titleText = titleMap[stageNum] || `STAGE ${stageNum} INSPECTION REPORT`;

        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();

        let currentY = startY + 5;
        const innerW = pageW - 10;
        const innerX = startX + 5;

        currentY = this.drawHeader(doc, innerX, currentY, innerW, data, titleText);
        currentY = this.drawInfoGrid(doc, innerX, currentY, innerW, data);

        const footerH = 130;
        const footerStartY = (startY + pageH) - footerH - 5;

        // Dynamic Content Area
        if (stageKey === 'stage3') {
            this.drawStage3Content(doc, innerX, currentY, innerW, data, footerStartY);
        } else if (stageKey === 'stage2') {
            this.drawStage2Content(doc, innerX, currentY, innerW, data, footerStartY);
        } else {
            this.drawGeneralStatusContent(doc, innerX, currentY, innerW, data, footerStartY, stageKey);
        }

        const footerTitle = stageKey === 'stage4' || stageKey === 'stage5' ? 'NDT Inspection by' : 'Inspection by';
        this.drawFooter(doc, innerX, footerStartY, innerW, data, footerTitle);
    }

    drawStage2Content(doc, x, y, width, data, bottomY) {
        const headerH = 25;
        // Title: Back chip – Required / not required
        const title = 'Back chip – Required / not required';
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
            .text(title, x, y + 8, { width: width, align: 'center' });

        let curY = y + headerH;
        const rowH = 30;

        // Columns: 3 equal width for now
        const colW = width / 3;

        doc.rect(x, curY, colW, rowH).stroke();
        doc.rect(x + colW, curY, colW, rowH).stroke();
        doc.rect(x + 2 * colW, curY, colW, rowH).stroke();

        const tY = curY + 10;
        const pad = 5;

        // Back Chip PT - Red Bold
        doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(10);
        doc.text('Back Chip PT', x + pad, tY);

        // YES / No - Red Bold
        doc.text('YES / No', x + colW + pad, tY);

        // YES - Black Regular (Static as per request "keep like this")
        doc.font(this.fonts.bold).fillColor(this.colors.black);
        doc.text('YES', x + 2 * colW + pad, tY);

        // Vertical lines helper for visual clarity (already drawn by rects but good to be sure)
    }

    // ==========================================
    // SHARED COMPONENTS
    // ==========================================

    drawHeader(doc, x, y, width, data, titleText) {
        const headerH = 70;
        doc.lineWidth(0.5).strokeColor(this.colors.black);

        // Logo Box (Left)
        const logoW = 160;
        doc.rect(x, y, logoW, headerH).stroke();

        // Try to draw logo
        this.drawLogo(doc, x, y, logoW, headerH);

        // Title Box (Right) - Split into Title and Report No
        const titleBoxW = width - logoW;
        const titleRowH = 45;
        const reportRowH = 25;

        doc.rect(x + logoW, y, titleBoxW, titleRowH).stroke();
        doc.rect(x + logoW, y + titleRowH, titleBoxW, reportRowH).stroke();

        // Title Text
        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.red)
            .text(titleText, x + logoW, y + 18, { width: titleBoxW, align: 'center' });

        // Report No
        const reportY = y + titleRowH + 8;
        doc.fontSize(10);

        // "Report No :" in Red Bold, Value in Black Regular
        const labelText = "Report No : ";
        const labelW = doc.widthOfString(labelText);
        const valText = data.reportNo || '-';

        // Centering logic roughly
        const fullTextW = labelW + doc.widthOfString(valText);
        const startTextX = x + logoW + (titleBoxW - fullTextW) / 2;

        doc.fillColor(this.colors.red).font(this.fonts.bold).text(labelText, startTextX, reportY, { continued: true });
        doc.fillColor(this.colors.black).font(this.fonts.regular).text(valText);

        return y + headerH + 5; // spacing
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 22;
        const col1W = width * 0.15; // Label
        const col2W = width * 0.35; // Value
        const col3W = width * 0.15; // Label
        const col4W = width * 0.35; // Value

        const rows = [
            { l1: 'MSN:', v1: data.msn, l2: 'TAG NO.:', v2: data.tagNo },
            { l1: 'CLIENT:', v1: data.client, l2: 'EQUIPMENT:', v2: data.equipment },
            { l1: 'Projects ID', v1: data.projectsId, l2: 'Linde DRG No:', v2: data.lindeDrgNo },
            { l1: 'P.O. NO.:', v1: data.poNo, l2: 'DRG. NO.:', v2: data.drgNo },
            { l1: 'CODE:', v1: data.code, l2: 'INSP. AGENCY:', v2: data.inspAgency },
        ];

        let curY = y;
        doc.fontSize(9);

        rows.forEach(row => {
            // Draw cells
            doc.rect(x, curY, col1W, rowH).stroke();
            doc.rect(x + col1W, curY, col2W, rowH).stroke();
            doc.rect(x + col1W + col2W, curY, col3W, rowH).stroke();
            doc.rect(x + col1W + col2W + col3W, curY, col4W, rowH).stroke();

            const textY = curY + 7;
            const pad = 4;

            // Labels Red Bold
            doc.font(this.fonts.bold).fillColor(this.colors.red);
            doc.text(row.l1, x + pad, textY, { width: col1W - pad * 2 });
            doc.text(row.l2, x + col1W + col2W + pad, textY, { width: col3W - pad * 2 });

            // Values Black Regular
            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(row.v1, x + col1W + pad, textY, { width: col2W - pad * 2 });
            doc.text(row.v2, x + col1W + col2W + col3W + pad, textY, { width: col4W - pad * 2 });

            curY += rowH;
        });

        return curY + 5;
    }

    drawInspectionTable(doc, x, y, width, data, bottomY, title) {
        // Header
        const headerH = 25;
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.black)
            .text(title, x, y + 8, { width: width, align: 'center' });

        let curY = y + headerH;

        // Table Columns
        const col1W = width * 0.40;
        const col2W = width * 0.60;
        const x2 = x + col1W;

        // Rows
        const rows = data.inspectionRows || [];
        const rowH = 19; // Fixed height mostly

        doc.fontSize(9);

        rows.forEach(row => {
            // Lines
            doc.moveTo(x, curY + rowH).lineTo(x + width, curY + rowH).stroke(); // Horizontal bottom

            // Text
            const textY = curY + 6;
            const pad = 4;

            if (row.name) {
                doc.font(this.fonts.bold).fillColor(this.colors.red);
                doc.text(row.name, x + pad, textY, { width: col1W - pad * 2 });
            }

            if (row.value) {
                doc.font(this.fonts.regular).fillColor(this.colors.black);
                doc.text(row.value, x2 + pad, textY, { width: col2W - pad * 2 });
            }

            curY += rowH;
        });

        // Vertical Lines for the list part
        doc.moveTo(x + col1W, y + headerH).lineTo(x + col1W, bottomY).stroke(); // Middle vertical

        // Outer vertical lines are drawn by the fill logic if we wanted, but here we can just draw them down to bottomY
        doc.moveTo(x, y).lineTo(x, bottomY).stroke(); // Left
        doc.moveTo(x + width, y).lineTo(x + width, bottomY).stroke(); // Right

        // Close bottom of table area if not filled
        doc.moveTo(x, bottomY).lineTo(x + width, bottomY).stroke();
    }

    drawStage3Content(doc, x, y, width, data, bottomY) {
        const title = 'WELDING DETAILS';
        const headerH = 25;
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.black)
            .text(title, x, y + 8, { width: width, align: 'center' });

        let curY = y + headerH;
        const rowH = 30;

        const fields = [
            { label: 'Welder No / ID:', value: data.welderNo || '-' },
            { label: 'Welding Process:', value: data.weldingProcess || '-' },
            { label: 'Visual Inspection Result:', value: data.qcStatus === 'approved' ? 'ACCEPTED' : (data.qcStatus || 'PENDING') }
        ];

        const col1W = width * 0.40;
        const x2 = x + col1W;

        fields.forEach(f => {
            doc.rect(x, curY, col1W, rowH).stroke();
            doc.rect(x + col1W, curY, width - col1W, rowH).stroke();

            const tY = curY + 10;
            const pad = 5;

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(10);
            doc.text(f.label, x + pad, tY);

            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(f.value, x2 + pad, tY);

            curY += rowH;
        });

        // Vertical lines helper
        doc.moveTo(x, y).lineTo(x, curY).stroke();
        doc.moveTo(x + width, y).lineTo(x + width, curY).stroke();
    }

    drawGeneralStatusContent(doc, x, y, width, data, bottomY, stageKey) {
        const title = `${stageKey.toUpperCase()} STATUS`;
        const headerH = 25;
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.black)
            .text(title, x, y + 8, { width: width, align: 'center' });

        let curY = y + headerH;
        const rowH = 40;

        // Simple Status display
        const status = data.qcStatus ? data.qcStatus.toUpperCase() : 'PENDING';
        let statusColor = this.colors.black;
        if (status === 'APPROVED') statusColor = '#008000'; // Green
        if (status === 'REJECTED') statusColor = '#FF0000';

        doc.rect(x, curY, width, rowH).stroke();

        doc.font(this.fonts.bold).fontSize(12).fillColor(this.colors.black);
        doc.text(`INSPECTION STATUS:`, x + 10, curY + 15, { continued: true });

        doc.fillColor(statusColor).text(`  ${status}`);
    }

    drawFooter(doc, x, y, width, data, title) {
        // Footer Header
        const headerH = 20;
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
            .text(title, x, y + 5, { width: width, align: 'center' });

        let curY = y + headerH;
        const totalH = 4 * 18 + 5; // 4 rows approx
        // Ensure bottom matches exact layout
        // Rows: Titles, Names, Dates, Sign
        const rowH = 20;

        // Columns
        const colW = width / 3;

        // Draw outer box
        doc.rect(x, curY, width, rowH * 4).stroke();

        // Vertical lines
        doc.moveTo(x + colW, curY).lineTo(x + colW, curY + rowH * 4).stroke();
        doc.moveTo(x + 2 * colW, curY).lineTo(x + 2 * colW, curY + rowH * 4).stroke();

        // Horizontal lines
        for (let i = 1; i < 4; i++) {
            doc.moveTo(x, curY + i * rowH).lineTo(x + width, curY + i * rowH).stroke();
        }

        // Text
        const titles = ['Production Engineer', 'QC Engineer', 'AI / CLIENT / TPIA'];
        const names = [data.productionEngineerName, data.qcEngineerName, data.aiName];
        const dates = [data.submissionDate, data.qcDate, data.aiDate];
        // Use 'Approve' if status is approved, otherwise show status or empty
        const qcSign = (data.qcStatus === 'approved' || data.qcStatus === 'submitted') ? 'Approve' : '';
        const signs = ['', qcSign, data.aiSign];

        const pad = 4;
        const tY = 6;

        doc.fontSize(9);

        // Row 1: Titles (Red Bold)
        doc.font(this.fonts.bold).fillColor(this.colors.red);
        doc.text(titles[0], x + pad, curY + tY, { width: colW - pad * 2, align: 'left' });
        doc.text(titles[1], x + colW + pad, curY + tY, { width: colW - pad * 2, align: 'left' });
        doc.text(titles[2], x + 2 * colW + pad, curY + tY, { width: colW - pad * 2, align: 'left' });

        // For Values, SS2 shows them in Red Bold as well (or at least distinctive). 
        // Let's use Red Bold for Names/Dates/Sign to match the visual "structure" requested.

        // Row 2: Names (Red Bold)
        doc.font(this.fonts.bold).fillColor(this.colors.red);
        doc.text(names[0] || '', x + pad, curY + rowH + tY);
        doc.text(names[1] || '', x + colW + pad, curY + rowH + tY);
        doc.text(names[2] || '', x + 2 * colW + pad, curY + rowH + tY);

        // Row 3: Dates (Red Bold)
        doc.text(dates[0] || '', x + pad, curY + 2 * rowH + tY);
        doc.text(dates[1] || '', x + colW + pad, curY + 2 * rowH + tY);
        doc.text(dates[2] || '', x + 2 * colW + pad, curY + 2 * rowH + tY);

        // Row 4: Sign (Red Bold)
        doc.text('', x + pad, curY + 3 * rowH + tY);
        doc.text(signs[1] || '', x + colW + pad, curY + 3 * rowH + tY);
        doc.text(signs[2] || '', x + 2 * colW + pad, curY + 3 * rowH + tY);
    }

    drawLogo(doc, x, y, w, h) {
        try {
            // Attempt to find logo in uploads
            const uploadDir = path.join(__dirname, '../uploads');
            if (fs.existsSync(uploadDir)) {
                const files = fs.readdirSync(uploadDir);
                const logoFile = files.find(f => f.toLowerCase().startsWith('logo') && (f.endsWith('.png') || f.endsWith('.jpg')));
                if (logoFile) {
                    doc.image(path.join(uploadDir, logoFile), x + 5, y + 5, { fit: [w - 10, h - 10], align: 'center', valign: 'center' });
                    return;
                }
            }
        } catch (e) { }
        // Fallback Text Logo
        doc.font(this.fonts.bold).fontSize(12).fillColor(this.colors.darkBlue)
            .text('Shreno Engineering Limited', x, y + h / 2 - 6, { width: w, align: 'center' });
    }
}

module.exports = new PDFGenerator();
