const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class DishEndPdfGenerator {
    constructor() {
        this.colors = {
            black: '#000000',
            white: '#FFFFFF',
            headerBg: '#F1F5F9',
            border: '#000000'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    formatText(text) {
        if (text === null || text === undefined || text === '') return '-';
        return String(text).trim();
    }

    formatDate(val) {
        if (!val || val === '-' || val === 'null' || val === 'undefined') return '-';
        if (typeof val === 'string') {
            const s = val.trim();
            if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
                return s.replace(/\//g, '-');
            }
            if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) {
                const parts = s.split('T')[0].split(/[-/]/);
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const mon = String(d.getMonth() + 1).padStart(2, '0');
            const yr = d.getFullYear();
            return `${day}-${mon}-${yr}`;
        }
        return String(val);
    }

    drawLogoAndTitle(doc, x, y, width, height, companyInfo) {
        const logoBoxW = 160;
        const titleBoxW = width - logoBoxW;

        doc.lineWidth(0.5).strokeColor(this.colors.border);
        doc.rect(x, y, logoBoxW, height).stroke();
        doc.rect(x + logoBoxW, y, titleBoxW, height).stroke();

        // Logo Section
        let logoDrawn = false;
        const logoPath = path.resolve(__dirname, '..', 'assets', 'shreno-logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 8, y + 6, {
                    fit: [logoBoxW - 16, height - 12],
                    align: 'center',
                    valign: 'center'
                });
                logoDrawn = true;
            } catch (e) { }
        }
        if (!logoDrawn) {
            const altPath = companyInfo?.logoPath || path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
            if (fs.existsSync(altPath)) {
                try {
                    doc.image(altPath, x + 8, y + 6, {
                        fit: [logoBoxW - 16, height - 12],
                        align: 'center',
                        valign: 'center'
                    });
                    logoDrawn = true;
                } catch (e) { }
            }
        }
        if (!logoDrawn) {
            const compName = companyInfo?.name || 'Shreno Engineering Limited';
            doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.black)
                .text(compName, x + 5, y + 20, { width: logoBoxW - 10, align: 'center' });
        }

        // Title Section
        doc.font(this.fonts.bold).fontSize(15).fillColor(this.colors.black)
            .text('DISH END INSPECTION REPORT', x + logoBoxW, y + 20, { width: titleBoxW, align: 'center' });
    }

    drawCompactHeader(doc, x, y, width, data, companyInfo) {
        const compactH = 28;
        doc.lineWidth(0.5).strokeColor(this.colors.border);
        doc.rect(x, y, width, compactH).stroke();

        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.black)
            .text(companyInfo?.name || 'Shreno Engineering Limited', x + 8, y + 9, { width: 170, align: 'left' });

        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.black)
            .text('DISH END INSPECTION REPORT', x + 180, y + 9, { width: width - 360, align: 'center' });

        const rNo = this.formatText(data.report_no || data.msn);
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
            .text(`Report No: ${rNo}`, x + width - 170, y + 5, { width: 165, align: 'right' })
            .font(this.fonts.regular).fontSize(6.5).fillColor(this.colors.black)
            .text(`MSN: ${this.formatText(data.msn)}`, x + width - 170, y + 16, { width: 165, align: 'right' });

        return y + compactH;
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({
            margin: 25,
            size: 'A4',
            bufferPages: true,
            autoFirstPage: true
        });

        doc.pipe(res);

        const startX = 40;
        const startY = 35;
        const width = doc.page.width - 80; // 515.28 pt
        const bottomLineY = doc.page.height - 40; // 801.89 pt
        const maxY = bottomLineY - 10; // 791.89 pt

        let curY = startY;

        // 1. Header Section
        const headerH = 55;
        this.drawLogoAndTitle(doc, startX, curY, width, headerH, companyInfo);
        curY += headerH;

        // 2. Info Grid Section
        const rowH = 18;
        const col3W = width / 3;
        const col2W = width / 2;

        // Row 1: MSN, TAG NO, DATE (3 columns)
        doc.lineWidth(0.5).strokeColor(this.colors.border).rect(startX, curY, width, rowH).stroke();
        doc.moveTo(startX + col3W, curY).lineTo(startX + col3W, curY + rowH).stroke();
        doc.moveTo(startX + 2 * col3W, curY).lineTo(startX + 2 * col3W, curY + rowH).stroke();

        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
            .text('MSN:', startX + 5, curY + 5);
        doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
            .text(this.formatText(data.msn), startX + 45, curY + 5, { width: col3W - 50 });

        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
            .text('TAG NO.:', startX + col3W + 5, curY + 5);
        doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
            .text(this.formatText(data.tag_no), startX + col3W + 55, curY + 5, { width: col3W - 60 });

        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
            .text('DATE:', startX + 2 * col3W + 5, curY + 5);
        const reportDate = this.formatDate(data.report_date || data.createdAt);
        doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
            .text(reportDate, startX + 2 * col3W + 45, curY + 5, { width: col3W - 50 });

        curY += rowH;

        // Rows 2, 3, 4: (2 columns each)
        const gridRows = [
            { l1: 'CLIENT:', v1: data.client, l2: 'DRG. NO.:', v2: data.drg_no },
            { l1: 'P.O. NO.:', v1: data.po_no, l2: 'EQUIPMENT:', v2: data.equipment_name },
            { l1: 'CODE:', v1: data.code, l2: 'INSP. AGENCY:', v2: data.insp_agency }
        ];

        gridRows.forEach(row => {
            doc.rect(startX, curY, width, rowH).stroke();
            doc.moveTo(startX + col2W, curY).lineTo(startX + col2W, curY + rowH).stroke();

            doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
                .text(row.l1, startX + 5, curY + 5);
            doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                .text(this.formatText(row.v1), startX + 65, curY + 5, { width: col2W - 70 });

            doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
                .text(row.l2, startX + col2W + 5, curY + 5);
            doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                .text(this.formatText(row.v2), startX + col2W + 75, curY + 5, { width: col2W - 80 });

            curY += rowH;
        });

        // 3. Subtitle Row
        const subTitleH = 16;
        doc.rect(startX, curY, width, subTitleH).stroke();
        doc.font(this.fonts.bold).fontSize(8.5).fillColor(this.colors.black)
            .text('Description of works inspected', startX, curY + 4, { width: width, align: 'center' });
        curY += subTitleH;

        // 4. Works Table Header
        const col1 = 35;
        const col2 = 180;
        const col3 = 110;
        const col4 = 100;
        const col5 = width - col1 - col2 - col3 - col4; // 90.28 pt

        const drawWorksHeader = (y) => {
            let yPos = y;
            const subRowH = 15;
            doc.rect(startX, yPos, width, subRowH).stroke();
            doc.moveTo(startX + col1, yPos).lineTo(startX + col1, yPos + subRowH).stroke();
            doc.moveTo(startX + col1 + col2, yPos).lineTo(startX + col1 + col2, yPos + subRowH).stroke();
            doc.moveTo(startX + col1 + col2 + col3, yPos).lineTo(startX + col1 + col2 + col3, yPos + subRowH).stroke();
            doc.moveTo(startX + col1 + col2 + col3 + col4, yPos).lineTo(startX + col1 + col2 + col3 + col4, yPos + subRowH).stroke();

            doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
                .text('DISH END', startX + col1, yPos + 4, { width: col2, align: 'center' })
                .text('PART NO', startX + col1 + col2 + col3, yPos + 4, { width: col4, align: 'center' });
            yPos += subRowH;

            const headH = 24;
            doc.rect(startX, yPos, width, headH).stroke();
            doc.moveTo(startX + col1, yPos).lineTo(startX + col1, yPos + headH).stroke();
            doc.moveTo(startX + col1 + col2, yPos).lineTo(startX + col1 + col2, yPos + headH).stroke();
            doc.moveTo(startX + col1 + col2 + col3, yPos).lineTo(startX + col1 + col2 + col3, yPos + headH).stroke();
            doc.moveTo(startX + col1 + col2 + col3 + col4, yPos).lineTo(startX + col1 + col2 + col3 + col4, yPos + headH).stroke();

            doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
                .text('SR NO.', startX, yPos + 8, { width: col1, align: 'center' })
                .text('DESCRIPTION', startX + col1, yPos + 8, { width: col2, align: 'center' })
                .text('AS PER DRG.', startX + col1 + col2, yPos + 8, { width: col3, align: 'center' })
                .text('ACTUAL', startX + col1 + col2 + col3, yPos + 4, { width: col4, align: 'center' });

            if (data.vendor_dish_end_number) {
                doc.font(this.fonts.regular).fontSize(6.5).fillColor(this.colors.black)
                    .text(`(${data.vendor_dish_end_number})`, startX + col1 + col2 + col3, yPos + 14, { width: col4, align: 'center' });
            }

            doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
                .text('REMARKS', startX + col1 + col2 + col3 + col4, yPos + 8, { width: col5, align: 'center' });
            yPos += headH;
            return yPos;
        };

        curY = drawWorksHeader(curY);

        // Pre-calculate bottom bundle height (Notes + Instruments + Signatures)
        const noteH = 32;
        const instTitleH = 14;
        const instSRH = 14;
        const instCol1W = 135;
        const dataColW = (width - instCol1W) / 3;
        const iLabels = ['NAME:', 'ID NO. / SR NO.:', 'DUE DATE:'];
        const iFields = ['name', 'id_no', 'due_date'];
        const instruments = (data.instruments || []).slice(0, 3);

        const instRowHeights = iFields.map((field, idx) => {
            let maxTextH = 9;
            [0, 1, 2].forEach(colIdx => {
                const inst = instruments[colIdx];
                let val = '-';
                if (inst) {
                    val = inst[field] || '-';
                    if (field === 'due_date') {
                        val = this.formatDate(val);
                    }
                }
                doc.font(this.fonts.regular).fontSize(7);
                const th = doc.heightOfString(String(val), { width: dataColW - 6, lineGap: 1 });
                if (th > maxTextH) maxTextH = th;
            });
            return Math.max(15, maxTextH + 5);
        });

        const totalInstH = instTitleH + instSRH + instRowHeights.reduce((a, b) => a + b, 0);
        const sigH = 75; // Clean, increased height signature block (~75pt)
        const totalBottomBundleH = noteH + totalInstH + sigH;

        // 5. Table Rows
        const items = data.items || [];

        items.forEach((item, idx) => {
            const desc = this.formatText(item.description);
            const drg = this.formatText(item.as_per_drg);
            const act = this.formatText(item.actual);
            const rem = this.formatText(item.remarks);

            doc.font(this.fonts.regular).fontSize(7);
            const descH = doc.heightOfString(desc, { width: col2 - 8, lineGap: 1 });
            const drgH = doc.heightOfString(drg, { width: col3 - 4, lineGap: 1 });
            const actH = doc.heightOfString(act, { width: col4 - 4, lineGap: 1 });
            const remH = doc.heightOfString(rem, { width: col5 - 4, lineGap: 1 });

            const maxTextH = Math.max(descH, drgH, actH, remH);
            const itemH = Math.max(14, maxTextH + 3.5);

            // Check if page break is needed for this row
            if (curY + itemH > maxY) {
                doc.addPage({ margin: 25, size: 'A4' });
                curY = startY;
                curY = this.drawCompactHeader(doc, startX, curY, width, data, companyInfo);
                curY = drawWorksHeader(curY);
            }

            doc.rect(startX, curY, width, itemH).stroke();
            doc.moveTo(startX + col1, curY).lineTo(startX + col1, curY + itemH).stroke();
            doc.moveTo(startX + col1 + col2, curY).lineTo(startX + col1 + col2, curY + itemH).stroke();
            doc.moveTo(startX + col1 + col2 + col3, curY).lineTo(startX + col1 + col2 + col3, curY + itemH).stroke();
            doc.moveTo(startX + col1 + col2 + col3 + col4, curY).lineTo(startX + col1 + col2 + col3 + col4, curY + itemH).stroke();

            const textPadY = 3.5;
            doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
                .text(String(item.sr_no || (idx + 1)), startX, curY + textPadY, { width: col1, align: 'center' })
                .text(desc, startX + col1 + 4, curY + textPadY, { width: col2 - 8, align: 'left', lineBreak: true, lineGap: 1 })
                .text(drg, startX + col1 + col2 + 2, curY + textPadY, { width: col3 - 4, align: 'center', lineBreak: true, lineGap: 1 })
                .text(act, startX + col1 + col2 + col3 + 2, curY + textPadY, { width: col4 - 4, align: 'center', lineBreak: true, lineGap: 1 })
                .text(rem, startX + col1 + col2 + col3 + col4 + 2, curY + textPadY, { width: col5 - 4, align: 'center', lineBreak: true, lineGap: 1 });

            curY += itemH;
        });

        // 6. Check if bottom bundle fits on current page
        if (curY + totalBottomBundleH > maxY) {
            doc.addPage({ margin: 25, size: 'A4' });
            curY = startY;
            curY = this.drawCompactHeader(doc, startX, curY, width, data, companyInfo);
        }

        // 7. Notes Section
        doc.rect(startX, curY, width, noteH).stroke();
        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
            .text('NOTE:', startX + 5, curY + 4);
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text('1. ALL DIMENSIONS ARE IN MM UNLESS OTHERWISE SPECIFIED.', startX + 45, curY + 4)
            .text('2. RELEASE FOR FURTHER PROCESS.', startX + 45, curY + 13)
            .text(`3. REPORT NO: ${this.formatText(data.report_no)}`, startX + 45, curY + 22);
        curY += noteH;

        // 8. Instrument Calibration Table
        doc.rect(startX, curY, width, instTitleH).stroke();
        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
            .text('INSTRUMENT CALIBRATION DETAILS:', startX + 5, curY + 3.5);
        curY += instTitleH;

        // Row 0: SR Numbers (1, 2, 3)
        doc.rect(startX, curY, width, instSRH).stroke();
        doc.moveTo(startX + instCol1W, curY).lineTo(startX + instCol1W, curY + instSRH).stroke();
        [1, 2, 3].forEach((n, i) => {
            const ix = startX + instCol1W + (i * dataColW);
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                .text(String(n), ix, curY + 3.5, { width: dataColW, align: 'center' });
            if (i < 2) doc.moveTo(ix + dataColW, curY).lineTo(ix + dataColW, curY + instSRH).stroke();
        });
        curY += instSRH;

        // Rows: NAME, ID NO, DUE DATE with dynamic row heights
        iLabels.forEach((lbl, idx) => {
            const iRowH = instRowHeights[idx];
            doc.rect(startX, curY, width, iRowH).stroke();
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                .text(lbl, startX + 5, curY + 4, { width: instCol1W });
            doc.moveTo(startX + instCol1W, curY).lineTo(startX + instCol1W, curY + iRowH).stroke();

            [0, 1, 2].forEach(colIdx => {
                const inst = instruments[colIdx];
                let val = '-';
                if (inst) {
                    val = inst[iFields[idx]] || '-';
                    if (iFields[idx] === 'due_date' && val !== '-') {
                        val = this.formatDate(val);
                    }
                }
                const ix = startX + instCol1W + (colIdx * dataColW);
                doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
                    .text(String(val), ix + 2, curY + 4, {
                        width: dataColW - 4,
                        align: 'center',
                        lineBreak: true,
                        lineGap: 1
                    });
                if (colIdx < 2) doc.moveTo(ix + dataColW, curY).lineTo(ix + dataColW, curY + iRowH).stroke();
            });

            curY += iRowH;
        });

        // 9. Signatures Area - Docked to bottom side with increased height
        if (curY + sigH > bottomLineY) {
            doc.addPage({ margin: 25, size: 'A4' });
            curY = startY;
            curY = this.drawCompactHeader(doc, startX, curY, width, data, companyInfo);
        }

        const sigY = bottomLineY - sigH;
        const sigW = width / 3;

        doc.lineWidth(0.5).strokeColor(this.colors.border);
        doc.rect(startX, sigY, width, sigH).stroke();
        doc.moveTo(startX + sigW, sigY).lineTo(startX + sigW, sigY + sigH).stroke();
        doc.moveTo(startX + 2 * sigW, sigY).lineTo(startX + 2 * sigW, sigY + sigH).stroke();

        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.black);
        const sigLabelY = sigY + sigH - 18;
        doc.text('Production ENGINEER', startX, sigLabelY, { width: sigW, align: 'center' });
        doc.text('QC Engineer', startX + sigW, sigLabelY, { width: sigW, align: 'center' });
        doc.text('TPIA/AI/CLIENT', startX + 2 * sigW, sigLabelY, { width: sigW, align: 'center' });

        // 10. Footers across all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const originalBottomMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;

            const footY = bottomLineY + 5;
            doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
            doc.text('EXHIBIT 10/3', startX, footY, { lineBreak: false });
            doc.text('GENERAL INSPECTION REPORT', startX, footY, { width: width, align: 'center', lineBreak: false });
            doc.text('REV.: R1', startX + width - 60, footY, { lineBreak: false });

            doc.page.margins.bottom = originalBottomMargin;
        }

        doc.end();
    }
}

module.exports = new DishEndPdfGenerator();
