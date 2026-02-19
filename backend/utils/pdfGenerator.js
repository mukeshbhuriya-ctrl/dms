const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    constructor() {
        this.colors = {
            red: '#CC0000',
            black: '#000000',
            darkBlue: '#000080',
            gray: '#505050',
            lightGray: '#b0b0b0'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
        this.margin = 30;
    }

    /**
     * Generates a single PDF with multiple pages, one for each stage provided.
     * @param {Object} allStagesData - Keys are 'stage1', 'stage2', etc., values are the report data for that stage.
     * @param {Object} res - Express response object
     */
    generateCompleteReport(allStagesData, res) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const stages = Object.keys(allStagesData).sort(); // e.g. ['stage1', 'stage2']

        stages.forEach((stage, index) => {
            if (index > 0) doc.addPage();

            const data = allStagesData[stage];

            if (stage === 'stage1') {
                this.drawStage1(doc, data);
            } else {
                // For Stage 2, 3, etc. use a generic layout for now as per instructions
                this.drawGenericStage(doc, data, stage);
            }
        });

        doc.end();
    }

    /**
     * Generates a single page report for Stage 1 (Backwards compatibility)
     */
    generateStage1Report(realData, res) {
        // FOR TESTING: Prioritize Dummy Data
        const data = { ...realData, ...this.getDummyData(1) };

        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        this.drawStage1(doc, data);

        doc.end();
    }

    /**
     * Draws the Stage 1 Report Layout
     */
    drawStage1(doc, data) {
        // Constants for Layout
        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;
        const contentBottomY = startY + pageH;

        // 1. Draw Main Outer Border (Thick)
        doc.rect(startX, startY, pageW, pageH)
            .strokeColor(this.colors.black)
            .lineWidth(1.5)
            .stroke();

        let currentY = startY + 5;
        const innerW = pageW - 10;
        const innerX = startX + 5;

        // 2. Header
        currentY = this.drawHeader(doc, innerX, currentY, innerW, data, 'SET UP & WELD VISUAL INSPECTION REPORT');

        // 3. Info Grid
        currentY = this.drawInfoGrid(doc, innerX, currentY, innerW, data);

        // 4. Footer Section Calculation
        // Footer Height: Title(20) + 3 rows of 18 + 4th row (18) + padding
        const footerHeaderH = 20;
        const footerRowH = 18;
        const footerTotalH = footerHeaderH + (4 * footerRowH);

        const footerStartY = contentBottomY - 5 - footerTotalH;

        // 5. Inspection Table
        this.drawInspectionTable(doc, innerX, currentY, innerW, data, footerStartY, 'LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT');

        // 6. Footer Section
        this.drawFooter(doc, innerX, footerStartY, innerW, data, 'Set Up Inspection by');
    }

    /**
     * Draws a Generic Stage Report Layout (For Stage 2+)
     * Uses dummy data if real data is missing, similar structure to Stage 1
     */
    drawGenericStage(doc, realData, stageKey) {
        const stageNum = stageKey.replace('stage', '');
        // Merge with dummy data for this stage
        const data = { ...realData, ...this.getDummyData(stageNum) };

        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;
        const contentBottomY = startY + pageH;

        // Border
        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();

        let currentY = startY + 5;
        const innerW = pageW - 10;
        const innerX = startX + 5;

        // Header
        const title = `STAGE ${stageNum} INSPECTION REPORT`;
        currentY = this.drawHeader(doc, innerX, currentY, innerW, data, title);

        // Info Grid
        currentY = this.drawInfoGrid(doc, innerX, currentY, innerW, data);

        // Footer Calc
        const footerHeaderH = 20;
        const footerRowH = 18;
        const footerTotalH = footerHeaderH + (4 * footerRowH);
        const footerStartY = contentBottomY - 5 - footerTotalH;

        // Inspection Table (Generic columns)
        this.drawInspectionTable(doc, innerX, currentY, innerW, data, footerStartY, `STAGE ${stageNum} CHECKS`);

        // Footer
        this.drawFooter(doc, innerX, footerStartY, innerW, data, 'Inspected by');
    }

    // --- Shared Helper Methods ---

    drawHeader(doc, x, y, width, data, titleText) {
        const headerH = 70;
        doc.lineWidth(0.5);

        // Logo Box (Left)
        const logoW = 140;
        doc.rect(x, y, logoW, headerH).stroke();

        // Title Box (Right)
        const titleBoxW = width - logoW;
        const titleRow1H = 45;
        const titleRow2H = 25;

        doc.rect(x + logoW, y, titleBoxW, titleRow1H).stroke();
        doc.rect(x + logoW, y + titleRow1H, titleBoxW, titleRow2H).stroke();

        // Content
        this.drawLogo(doc, x, y, logoW, headerH);

        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.red)
            .text(titleText, x + logoW, y + 18, { width: titleBoxW, align: 'center' });

        const reportNoY = y + titleRow1H + 8;
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red)
            .text('Report No :', x + logoW + 10, reportNoY, { continued: true });
        doc.font(this.fonts.regular).fillColor(this.colors.black)
            .text(` ${data.reportNo || ''}`);

        return y + headerH + 5;
    }

    drawInfoGrid(doc, innerX, y, innerW, data) {
        const infoRowH = 22;
        const infoTableH = infoRowH * 5;

        const col1W = innerW * 0.15;
        const col2W = innerW * 0.35;
        const col3W = innerW * 0.15;
        const col4W = innerW * 0.35;

        const drawRow = (curY, l1, v1, l2, v2) => {
            doc.rect(innerX, curY, col1W, infoRowH).stroke();
            doc.rect(innerX + col1W, curY, col2W, infoRowH).stroke();
            doc.rect(innerX + col1W + col2W, curY, col3W, infoRowH).stroke();
            doc.rect(innerX + col1W + col2W + col3W, curY, col4W, infoRowH).stroke();

            const tY = curY + 7;
            const textPad = 4;

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(9);
            doc.text(l1, innerX + textPad, tY, { width: col1W });

            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(v1 || '', innerX + col1W + textPad, tY, { width: col2W });

            doc.font(this.fonts.bold).fillColor(this.colors.red);
            doc.text(l2, innerX + col1W + col2W + textPad, tY, { width: col3W });

            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(v2 || '', innerX + col1W + col2W + col3W + textPad, tY, { width: col4W });
        };

        drawRow(y, 'MSN:', data.msn, 'TAG NO.:', data.tagNo);
        drawRow(y + infoRowH, 'CLIENT:', data.client, 'EQUIPMENT:', data.equipment);
        drawRow(y + infoRowH * 2, 'Projects ID:', data.projectsId, 'Linde DRG No:', data.lindeDrgNo);
        drawRow(y + infoRowH * 3, 'P.O. NO.:', data.poNo, 'DRG. NO.:', data.drgNo);
        drawRow(y + infoRowH * 4, 'CODE:', data.code, 'INSP. AGENCY:', data.inspAgency);

        return y + infoTableH + 5;
    }

    drawInspectionTable(doc, x, y, width, data, maxY, title) {
        // Header
        const headerH = 25;
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.black)
            .text(title, x, y + 8, { width: width, align: 'center' });

        let currentY = y + headerH;

        // Columns definition - Label(40%) + Data(60%)
        const col1W = width * 0.40;
        const colDataW = width - col1W;

        const x1 = x;
        const x2 = x1 + col1W;
        const x3 = x + width;

        const defaultRowH = 18;

        // 1. Calculate Rows (Standard height)
        const rowsToDraw = [];
        const dataRows = data.jointRows || [];

        dataRows.forEach(row => {
            let h = defaultRowH;
            if (row.label) {
                doc.font(this.fonts.bold).fontSize(9);
                const txtH = doc.heightOfString(row.label, { width: col1W - 8 });
                if (txtH + 10 > h) h = txtH + 10;
            }
            rowsToDraw.push({ ...row, h, isData: true });
        });

        // REVERTED stretching logic. Standard rows.

        // 2. Draw Horizontal Lines and Text
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.moveTo(x, currentY).lineTo(x + width, currentY).stroke();

        rowsToDraw.forEach(row => {
            const rowBottom = currentY + row.h;

            if (row.isData) {
                const tY = currentY + 5;
                const pad = 4;

                if (row.label) {
                    doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(9);
                    doc.text(row.label, x1 + pad, tY, { width: col1W - 2 * pad });
                }

                doc.font(this.fonts.regular).fillColor(this.colors.black);
                doc.text(row.val1 || '', x2 + pad, tY, { width: colDataW - 2 * pad });
            }

            doc.moveTo(x, rowBottom).lineTo(x + width, rowBottom).stroke();
            currentY = rowBottom;
        });

        // 3. Draw Vertical Lines (Full Height to Footer)
        const tableTop = y + headerH;
        const tableBottom = maxY;

        doc.moveTo(x1, tableTop).lineTo(x1, tableBottom).stroke();
        doc.moveTo(x2, tableTop).lineTo(x2, tableBottom).stroke();
        doc.moveTo(x3, tableTop).lineTo(x3, tableBottom).stroke();
    }

    drawFooter(doc, x, y, width, data, title) {
        // Draw Header Box
        const headerH = 20;
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
            .text(title, x, y + 5, { width: width, align: 'center' });

        let curY = y + headerH;
        const rowH = 18;
        const colW = width / 3;

        const rows = [
            ['Production Engineer', 'QC Engineer', 'AI / CLIENT / TPIA'],
            [data.prodEngName, data.qcEngName, data.aiName],
            [data.prodEngDate, data.qcEngDate, data.aiDate],
            ['', data.qcEngStatus, data.aiSign]
        ];

        for (let i = 0; i <= 4; i++) {
            const ly = curY + i * rowH;
            doc.moveTo(x, ly).lineTo(x + width, ly).stroke();
        }

        const bottomsY = curY + 4 * rowH;
        doc.moveTo(x, curY).lineTo(x, bottomsY).stroke();
        doc.moveTo(x + colW, curY).lineTo(x + colW, bottomsY).stroke();
        doc.moveTo(x + 2 * colW, curY).lineTo(x + 2 * colW, bottomsY).stroke();
        doc.moveTo(x + width, curY).lineTo(x + width, bottomsY).stroke();

        rows.forEach((rowCols, i) => {
            const tY = curY + i * rowH + 5;
            const pad = 4;

            doc.fontSize(9).fillColor(this.colors.red).font(this.fonts.bold);
            doc.text(rowCols[0] || '', x + pad, tY);
            doc.text(rowCols[1] || '', x + colW + pad, tY);
            doc.text(rowCols[2] || '', x + 2 * colW + pad, tY);
        });
    }

    drawLogo(doc, x, y, w, h) {
        try {
            const uploadDir = path.join(__dirname, '../uploads');
            if (fs.existsSync(uploadDir)) {
                const files = fs.readdirSync(uploadDir);
                const logoFile = files.find(f => f.startsWith('logo_') && (f.endsWith('.png') || f.endsWith('.jpg')));
                if (logoFile) {
                    doc.image(path.join(uploadDir, logoFile), x + 5, y + 5, { fit: [w - 10, h - 10], align: 'center', valign: 'center' });
                    return;
                }
            }
        } catch (e) { }
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.darkBlue)
            .text('Shreno Engineering Limited', x, y + h / 2 - 5, { width: w, align: 'center' });
    }

    getDummyData(stageNum) {
        // Base dummy data
        const base = {
            msn: '0101230',
            client: 'Test Client 1',
            poNo: 'PO-2024-001',
            tagNo: 'TAG-506465',
            equipment: 'E4 Heat Exchanger',
            projectsId: 'PRJ-103923',
            lindeDrgNo: '033423',
            drgNo: '023423',
            code: 'ASME Sec VIII Div 1',
            inspAgency: 'TPIA Agency 3',
            reportNo: 'R/0101230/A050/1',
            jointNo: 'A050',
            prodEngName: 'Vikram',
            prodEngDate: '1/1/26',
            qcEngName: 'Dhruv Panchal',
            qcEngDate: '2/1/26',
            qcEngStatus: 'Approve',
            aiName: 'Name',
            aiDate: 'Date',
            aiSign: 'Sign'
        };

        if (stageNum == 1 || stageNum === undefined) {
            return {
                ...base,
                jointRows: [
                    { label: 'Joint Number', val1: 'CS1' },
                    { label: 'Material Identification', val1: 'X' },
                    { label: 'Weld joint configuration', val1: 'Y' },
                    { label: 'Root Gap', val1: 'Q' },
                    { label: 'Root Face', val1: '-' },
                    { label: 'Degree for "V"', val1: '-' },
                    { label: 'Offset', val1: '-' },
                    { label: 'Alignment', val1: '-' },
                    { label: 'Weld edge Visual', val1: '-' },
                    { label: 'Length of the Shell', val1: '-' },
                    { label: 'Outside circumference', val1: '-' },
                    { label: 'Inside Gauge / Template Verification', val1: '-' },
                    { label: 'Outside Gauge / Template verification (if Applicable)', val1: '-' },
                    { label: 'Tack Welder Number', val1: '-' }
                ]
            };
        } else {
            // Dummy data for Stage 2, 3, etc.
            return {
                ...base,
                reportNo: `R/0101230/A050/${stageNum}`,
                jointRows: [
                    { label: `Stage ${stageNum} Check 1`, val1: 'OK' },
                    { label: `Stage ${stageNum} Check 2`, val1: 'OK' },
                    { label: `Stage ${stageNum} Parameter A`, val1: '12.5mm' },
                    { label: `Stage ${stageNum} Parameter B`, val1: 'Pass' },
                    { label: 'Visual Inspection', val1: 'Acceptable' },
                    { label: 'NDT Result', val1: 'Pending' }
                ]
            };
        }
    }
}

module.exports = new PDFGenerator();
