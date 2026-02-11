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

    // Main entry point for Stage 1
    generateStage1Report(realData, res) {
        // FOR TESTING: Prioritize Dummy Data
        const data = { ...realData, ...this.getDummyData() };

        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        // Constants for Layout
        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50; // Width of the visual frame
        const pageH = doc.page.height - 50; // Height of the visual frame
        const contentBottomY = startY + pageH;

        // 1. Draw Main Outer Border (Thick)
        doc.rect(startX, startY, pageW, pageH)
            .strokeColor(this.colors.black)
            .lineWidth(1.5)
            .stroke();

        // 2. Header Section
        let currentY = startY + 5; // Padding inside main border
        const innerW = pageW - 10; // Width of inner tables
        const innerX = startX + 5;

        // Draw Header Table Frame based on visual
        const headerH = 70;
        doc.lineWidth(0.5);

        // Logo Box (Left)
        const logoW = 140;
        doc.rect(innerX, currentY, logoW, headerH).stroke();

        // Title Box (Right) - Split into two rows
        const titleBoxW = innerW - logoW;
        const titleRow1H = 45;
        const titleRow2H = 25;

        doc.rect(innerX + logoW, currentY, titleBoxW, titleRow1H).stroke();
        doc.rect(innerX + logoW, currentY + titleRow1H, titleBoxW, titleRow2H).stroke();

        // Content: Logo
        this.drawLogo(doc, innerX, currentY, logoW, headerH);

        // Content: Title
        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.red)
            .text('SET UP & WELD VISUAL INSPECTION REPORT',
                innerX + logoW, currentY + 18, { width: titleBoxW, align: 'center' });

        // Content: Report No
        const reportNoY = currentY + titleRow1H + 8;
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red)
            .text('Report No :', innerX + logoW + 10, reportNoY, { continued: true });
        doc.font(this.fonts.regular).fillColor(this.colors.black)
            .text(` ${data.reportNo || ''}`);

        currentY += headerH + 5; // Space below header

        // 3. Info Grid
        // Rows: 5 rows
        const infoRowH = 22;
        const infoTableH = infoRowH * 5;

        // Columns: Label(15%), Val(35%), Label(15%), Val(35%)
        const col1W = innerW * 0.15;
        const col2W = innerW * 0.35;
        const col3W = innerW * 0.15;
        const col4W = innerW * 0.35;

        const drawInfoRow = (y, l1, v1, l2, v2) => {
            // Cell borders
            doc.rect(innerX, y, col1W, infoRowH).stroke();
            doc.rect(innerX + col1W, y, col2W, infoRowH).stroke();
            doc.rect(innerX + col1W + col2W, y, col3W, infoRowH).stroke();
            doc.rect(innerX + col1W + col2W + col3W, y, col4W, infoRowH).stroke();

            // Text
            const textY = y + 7;
            const textPad = 4;

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(9);
            doc.text(l1, innerX + textPad, textY, { width: col1W });

            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(v1 || '', innerX + col1W + textPad, textY, { width: col2W });

            doc.font(this.fonts.bold).fillColor(this.colors.red);
            doc.text(l2, innerX + col1W + col2W + textPad, textY, { width: col3W });

            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(v2 || '', innerX + col1W + col2W + col3W + textPad, textY, { width: col4W });
        };

        drawInfoRow(currentY, 'MSN:', data.msn, 'TAG NO.:', data.tagNo);
        drawInfoRow(currentY + infoRowH, 'CLIENT:', data.client, 'EQUIPMENT:', data.equipment);
        drawInfoRow(currentY + infoRowH * 2, 'Projects ID:', data.projectsId, 'Linde DRG No:', data.lindeDrgNo);
        drawInfoRow(currentY + infoRowH * 3, 'P.O. NO.:', data.poNo, 'DRG. NO.:', data.drgNo);
        drawInfoRow(currentY + infoRowH * 4, 'CODE:', data.code, 'INSP. AGENCY:', data.inspAgency);

        currentY += infoTableH + 5; // Space below Info Grid

        // 4. Footer Section Calculation
        // Footer Height: Title(20) + 3 rows of 18 + 4th row (18) + padding
        const footerHeaderH = 20;
        const footerRowH = 18;
        const footerTotalH = footerHeaderH + (4 * footerRowH);

        // Footer should be inside the main border, padding 5px from bottom
        const footerStartY = contentBottomY - 5 - footerTotalH;

        // 5. Inspection Table
        this.drawInspectionTable(doc, innerX, currentY, innerW, data, footerStartY);

        // 6. Footer Section
        this.drawFooter(doc, innerX, footerStartY, innerW, data);

        doc.end();
    }

    drawInspectionTable(doc, x, y, width, data, maxY) {
        // Header
        const headerH = 25;
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, width, headerH).stroke(); // Draw header box
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.black)
            .text('LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT', x, y + 8, { width: width, align: 'center' });

        let currentY = y + headerH;

        // Columns definition - REFACTORED TO REMOVE LAST 3 COLUMNS (Keeping only Label + Data1)
        const col1W = width * 0.35;
        const colDataW = width - col1W; // Remaining width for the single data column

        // Column X positions
        const x1 = x;
        const x2 = x1 + col1W;
        const x3 = x + width; // Right edge

        const defaultRowH = 18;

        // 1. Calculate Rows and Heights
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

        // Calculate filler rows
        let usedHeight = rowsToDraw.reduce((sum, r) => sum + r.h, 0);
        let remainingH = maxY - currentY - usedHeight;

        // Ensure at least 0 height remaining
        while (remainingH >= defaultRowH) {
            rowsToDraw.push({ h: defaultRowH, isData: false });
            remainingH -= defaultRowH;
        }
        // Fill exact remaining pixels
        if (remainingH > 0.5) {
            rowsToDraw.push({ h: remainingH, isData: false });
        }

        // 2. Draw Horizontal Lines and Text
        doc.lineWidth(0.5).strokeColor(this.colors.black);

        // Top line of first row
        doc.moveTo(x, currentY).lineTo(x + width, currentY).stroke();

        rowsToDraw.forEach(row => {
            const rowBottom = currentY + row.h;

            // Draw text if data
            if (row.isData) {
                const tY = currentY + 5;
                const pad = 4;

                if (row.label) {
                    doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(9);
                    doc.text(row.label, x1 + pad, tY, { width: col1W - 2 * pad });
                }

                doc.font(this.fonts.regular).fillColor(this.colors.black);
                // Only drawing val1 as simplified column structure
                doc.text(row.val1 || '', x2 + pad, tY, { width: colDataW - 2 * pad });
            }

            // Draw Bottom Line
            doc.moveTo(x, rowBottom).lineTo(x + width, rowBottom).stroke();
            currentY = rowBottom;
        });

        // 3. Draw Vertical Lines (Full Height)
        const tableTop = y + headerH;
        const tableBottom = currentY;

        doc.moveTo(x1, tableTop).lineTo(x1, tableBottom).stroke(); // Left
        doc.moveTo(x2, tableTop).lineTo(x2, tableBottom).stroke(); // Split
        doc.moveTo(x3, tableTop).lineTo(x3, tableBottom).stroke(); // Right
    }

    drawFooter(doc, x, y, width, data) {
        // Draw Header Box
        const headerH = 20;
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
            .text('Set Up Inspection by', x, y + 5, { width: width, align: 'center' });

        let curY = y + headerH;
        const rowH = 18;
        const colW = width / 3;

        // Draw Content Grid
        // 4 rows
        const rows = [
            ['Production Engineer', 'QC Engineer', 'AI / CLIENT / TPIA'],
            [data.prodEngName, data.qcEngName, data.aiName],
            [data.prodEngDate, data.qcEngDate, data.aiDate],
            ['', data.qcEngStatus, data.aiSign]
        ];

        // Draw Horizontals
        // Lines: curY, curY+rowH, ..., curY+4rowH
        for (let i = 0; i <= 4; i++) {
            const ly = curY + i * rowH;
            doc.moveTo(x, ly).lineTo(x + width, ly).stroke();
        }

        // Draw Verticals
        const bottomsY = curY + 4 * rowH;
        doc.moveTo(x, curY).lineTo(x, bottomsY).stroke();
        doc.moveTo(x + colW, curY).lineTo(x + colW, bottomsY).stroke();
        doc.moveTo(x + 2 * colW, curY).lineTo(x + 2 * colW, bottomsY).stroke();
        doc.moveTo(x + width, curY).lineTo(x + width, bottomsY).stroke();

        // Fill Text
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
        // Fallback
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.darkBlue)
            .text('Shreno Engineering Limited', x, y + h / 2 - 5, { width: w, align: 'center' });
    }

    getDummyData() {
        return {
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
            date: '11/02/2026',
            jointRows: [
                { label: 'Joint Number', val1: 'CS1', val2: '1A01', val3: '', val4: '' },
                { label: 'Material Identification', val1: 'X', val2: '', val3: '', val4: '' },
                { label: 'Weld joint configuration', val1: 'Y', val2: '', val3: '', val4: '' },
                { label: 'Root Gap', val1: 'Q', val2: '', val3: '', val4: '' },
                { label: 'Root Face', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Degree for "V"', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Offset', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Alignment', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Weld edge Visual', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Length of the Shell', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Outside circumference', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Inside Gauge / Template Verification', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Outside Gauge / Template verification (if Applicable)', val1: '', val2: '', val3: '', val4: '' },
                { label: 'Tack Welder Number', val1: '', val2: '', val3: '', val4: '' }
            ],
            prodEngName: 'Vikram',
            prodEngDate: '1/1/26',
            qcEngName: 'Dhruv Panchal',
            qcEngDate: '2/1/26',
            qcEngStatus: 'Approve',
            aiName: 'Name',
            aiDate: 'Date',
            aiSign: 'Sign'
        };
    }
}

module.exports = new PDFGenerator();
