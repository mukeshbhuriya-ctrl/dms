const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class FinalInspectionPdfGenerator {
    constructor() {
        this.colors = {
            black: '#000000',
            white: '#FFFFFF',
            grey: '#E2E8F0',
            headerBg: '#F1F5F9',
            zebraBg: '#F8FAFC',
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

    drawBox(doc, x, y, width, height, lineWidth = 0.5, fillColor = null) {
        doc.lineWidth(lineWidth).strokeColor(this.colors.border);
        if (fillColor) {
            doc.rect(x, y, width, height).fillAndStroke(fillColor, this.colors.border);
        } else {
            doc.rect(x, y, width, height).stroke();
        }
    }

    drawLine(doc, x1, y1, x2, y2, lineWidth = 0.5) {
        doc.lineWidth(lineWidth).strokeColor(this.colors.border).moveTo(x1, y1).lineTo(x2, y2).stroke();
    }

    drawMainHeader(doc, x, y, width, data, companyInfo) {
        const headerH = 50;
        const logoBoxW = 180;
        const titleBoxW = width - logoBoxW;

        this.drawBox(doc, x, y, width, headerH, 1);

        // 1. Logo Section
        const logoPath = path.resolve(__dirname, '..', 'assets', 'shreno-logo.png');
        let logoDrawn = false;
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 8, y + 6, {
                    fit: [logoBoxW - 16, headerH - 12],
                    align: 'center',
                    valign: 'center'
                });
                logoDrawn = true;
            } catch (e) {
                console.error('Failed to load primary logo in finalInspectionPdfGenerator:', e);
            }
        }
        if (!logoDrawn) {
            const altPath = companyInfo?.logoPath || path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
            if (fs.existsSync(altPath)) {
                try {
                    doc.image(altPath, x + 8, y + 6, {
                        fit: [logoBoxW - 16, headerH - 12],
                        align: 'center',
                        valign: 'center'
                    });
                    logoDrawn = true;
                } catch (e) { }
            }
        }
        if (!logoDrawn) {
            const compName = companyInfo?.name || 'SHRENO ENGINEERING LIMITED';
            const compFontSize = compName.length > 32 ? 8 : (compName.length > 25 ? 9 : 10);
            doc.font(this.fonts.bold).fontSize(compFontSize).fillColor(this.colors.black)
                .text(compName, x + 5, y + 18, { width: logoBoxW - 10, align: 'center' });
        }
        this.drawLine(doc, x + logoBoxW, y, x + logoBoxW, y + headerH, 1);

        // 2. Title Section
        const titleX = x + logoBoxW;
        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.black)
            .text('FINAL INSPECTION REPORT', titleX, y + 18, { width: titleBoxW, align: 'center' });

        return y + headerH;
    }

    drawCompactHeader(doc, x, y, width, data, companyInfo) {
        const compactH = 34;
        this.drawBox(doc, x, y, width, compactH, 0.8, this.colors.headerBg);

        // Left: Company name
        doc.font(this.fonts.bold).fontSize(9.5).fillColor(this.colors.black)
            .text(companyInfo?.name || 'SHRENO ENGINEERING LIMITED', x + 8, y + 11, { width: 190, align: 'left' });

        // Center: Title
        doc.font(this.fonts.bold).fontSize(10.5).fillColor(this.colors.black)
            .text('FINAL INSPECTION REPORT', x + 200, y + 10, { width: width - 390, align: 'center' });

        // Right: Report / MSN info
        const rNo = this.formatText(data.report_no || data.msn);
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
            .text(`Report No: ${rNo}`, x + width - 180, y + 6, { width: 172, align: 'right' })
            .font(this.fonts.regular).fontSize(6.5).fillColor(this.colors.black)
            .text(`MSN: ${this.formatText(data.msn)}`, x + width - 180, y + 18, { width: 172, align: 'right' });

        return y + compactH;
    }

    drawInfoGrid(doc, x, y, width, data) {
        let curY = y;

        // Row 1: MSN, TAG NO, DATE (3 columns)
        const col3W = width / 3;
        const row1Data = [
            { label: 'MSN:', val: this.formatText(data.msn) },
            { label: 'TAG NO.:', val: this.formatText(data.tag_no) },
            { label: 'DATE:', val: this.formatDate(data.report_date || data.createdAt) }
        ];

        let maxH1 = 10;
        const lblW3 = 52;
        const valW3 = col3W - lblW3 - 8;
        row1Data.forEach(col => {
            doc.font(this.fonts.regular).fontSize(7.5);
            const h = doc.heightOfString(col.val, { width: valW3, lineGap: 1 });
            if (h > maxH1) maxH1 = h;
        });
        const r1H = Math.max(18, maxH1 + 7);

        this.drawBox(doc, x, curY, width, r1H, 0.8);
        this.drawLine(doc, x + col3W, curY, x + col3W, curY + r1H, 0.5);
        this.drawLine(doc, x + (2 * col3W), curY, x + (2 * col3W), curY + r1H, 0.5);

        row1Data.forEach((col, idx) => {
            const startColX = x + (idx * col3W);
            doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
                .text(col.label, startColX + 5, curY + 4.5, { width: lblW3, align: 'left' });
            doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                .text(col.val, startColX + lblW3 + 2, curY + 4.5, { width: valW3, align: 'left', lineBreak: true, lineGap: 1 });
        });
        curY += r1H;

        // Rows 2, 3, 4: (2 columns each)
        const col2W = width / 2;
        const lblW2 = 68;
        const valW2 = col2W - lblW2 - 8;

        const infoRows2 = [
            [
                { label: 'CLIENT:', val: this.formatText(data.client) },
                { label: 'DRG. NO.:', val: this.formatText(data.drg_no) }
            ],
            [
                { label: 'P.O. NO.:', val: this.formatText(data.po_no) },
                { label: 'EQUIPMENT:', val: this.formatText(data.equipment_name) }
            ],
            [
                { label: 'CODE:', val: this.formatText(data.code) },
                { label: 'QAP CLAUSE:', val: this.formatText(data.qap_clause) }
            ]
        ];

        infoRows2.forEach(row => {
            let maxH = 10;
            row.forEach(col => {
                doc.font(this.fonts.regular).fontSize(7.5);
                const h = doc.heightOfString(col.val, { width: valW2, lineGap: 1 });
                if (h > maxH) maxH = h;
            });
            const rowH = Math.max(18, maxH + 7);

            this.drawBox(doc, x, curY, width, rowH, 0.8);
            this.drawLine(doc, x + col2W, curY, x + col2W, curY + rowH, 0.5);

            row.forEach((col, idx) => {
                const startColX = x + (idx * col2W);
                doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
                    .text(col.label, startColX + 5, curY + 4.5, { width: lblW2, align: 'left' });
                doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                    .text(col.val, startColX + lblW2 + 2, curY + 4.5, { width: valW2, align: 'left', lineBreak: true, lineGap: 1 });
            });

            curY += rowH;
        });

        return curY;
    }

    drawSectionBanner(doc, x, y, width, title) {
        const bannerH = 16;
        this.drawBox(doc, x, y, width, bannerH, 0.8, this.colors.headerBg);
        doc.font(this.fonts.bold).fontSize(8.5).fillColor(this.colors.black)
            .text(title, x, y + 4, { width: width, align: 'center' });
        return y + bannerH;
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({
            margins: {
                top: 30,
                bottom: 25,
                left: 30,
                right: 30
            },
            size: 'A4',
            layout: 'portrait',
            bufferPages: true,
            autoFirstPage: true
        });

        doc.pipe(res);

        const startX = 30;
        const width = doc.page.width - 60; // 535.28 pt
        const bottomLineY = doc.page.height - 40; // 801.89 pt
        const maxY = bottomLineY - 10; // 791.89 pt

        let curY = 30;

        // Page 1 Header & Info Grid
        curY = this.drawMainHeader(doc, startX, curY, width, data, companyInfo);
        curY += 5;
        curY = this.drawInfoGrid(doc, startX, curY, width, data);
        curY += 6;

        const checkPageBreak = (neededH, redrawHeaderCallback) => {
            if (curY + neededH > maxY) {
                doc.addPage({
                    margins: { top: 30, bottom: 25, left: 30, right: 30 },
                    size: 'A4',
                    layout: 'portrait'
                });
                curY = 30;
                curY = this.drawCompactHeader(doc, startX, curY, width, data, companyInfo);
                curY += 6;
                if (redrawHeaderCallback) {
                    curY = redrawHeaderCallback(curY);
                }
            }
        };

        // ═════════════════════════════════════════════════════════════════════
        // 1. FINAL DIMENSION REPORT TABLE
        // ═════════════════════════════════════════════════════════════════════
        const dimCols = [
            { id: 'sr_no', label: 'SR NO.', w: 35, align: 'center' },
            { id: 'description', label: 'DESCRIPTION', w: 175, align: 'left' },
            { id: 'required', label: 'REQUIRED', w: 90, align: 'center' },
            { id: 'actual', label: 'ACTUAL', w: 90, align: 'center' },
            { id: 'remarks', label: 'REMARKS', w: width - (35 + 175 + 90 + 90), align: 'left' }
        ];

        const drawDimHeader = (y) => {
            y = this.drawSectionBanner(doc, startX, y, width, 'FINAL DIMENSION REPORT');
            const headerH = 15;
            this.drawBox(doc, startX, y, width, headerH, 0.8, this.colors.headerBg);

            let tx = startX;
            dimCols.forEach((col, idx) => {
                if (idx < dimCols.length - 1) {
                    this.drawLine(doc, tx + col.w, y, tx + col.w, y + headerH, 0.5);
                }
                doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                    .text(col.label, tx + 1, y + 4.5, { width: col.w - 2, align: 'center' });
                tx += col.w;
            });
            return y + headerH;
        };

        checkPageBreak(35, drawDimHeader);
        if (curY === 30) {
            // Already drawn via callback
        } else {
            curY = drawDimHeader(curY);
        }

        const details = data.details || [];
        if (details.length === 0) {
            const emptyH = 18;
            this.drawBox(doc, startX, curY, width, emptyH, 0.4);
            doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                .text('No dimension records available.', startX, curY + 5, { width: width, align: 'center' });
            curY += emptyH;
        } else {
            details.forEach((item, idx) => {
                const cellValues = [
                    String(item.sr_no || (idx + 1)),
                    this.formatText(item.description),
                    this.formatText(item.required),
                    this.formatText(item.actual),
                    this.formatText(item.remarks)
                ];

                let maxH = 8;
                dimCols.forEach((col, cIdx) => {
                    const paddingX = col.align === 'center' ? 2 : 4;
                    doc.font(cIdx === 1 ? this.fonts.bold : this.fonts.regular).fontSize(7);
                    const h = doc.heightOfString(cellValues[cIdx], { width: col.w - (paddingX * 2), lineGap: 1 });
                    if (h > maxH) maxH = h;
                });
                const rowH = Math.max(16, maxH + 7);

                checkPageBreak(rowH, drawDimHeader);

                const rowBg = idx % 2 === 1 ? this.colors.zebraBg : null;
                this.drawBox(doc, startX, curY, width, rowH, 0.4, rowBg);

                let tx = startX;
                dimCols.forEach((col, cIdx) => {
                    if (cIdx < dimCols.length - 1) {
                        this.drawLine(doc, tx + col.w, curY, tx + col.w, curY + rowH, 0.4);
                    }
                    const paddingX = col.align === 'center' ? 2 : 4;
                    const font = cIdx === 1 ? this.fonts.bold : this.fonts.regular;
                    doc.font(font).fontSize(7).fillColor(this.colors.black)
                        .text(cellValues[cIdx], tx + paddingX, curY + 3.5, {
                            width: col.w - (paddingX * 2),
                            align: col.align,
                            lineBreak: true,
                            lineGap: 1
                        });
                    tx += col.w;
                });

                curY += rowH;
            });
        }
        curY += 6;

        // ═════════════════════════════════════════════════════════════════════
        // 2. NOZZLE DETAILS TABLE
        // ═════════════════════════════════════════════════════════════════════
        const nc1 = 38, nc2 = 65, nc3 = 100, nc4 = 75, nc5 = 65, nc6 = 52, nc7 = 70;
        const nc8 = width - (nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7);
        const nozzleCols = [
            { id: 'nozzle_mark', label: 'NOZZLE MARK', w: nc1, align: 'center' },
            { id: 'orientation', label: 'ORIENTATION', w: nc2, align: 'center' },
            { id: 'size', label: 'SIZE', w: nc3, align: 'left' },
            { id: 'location', label: 'LOCATION', w: nc4, align: 'left' },
            { id: 'elevation_approved', label: 'ELEVATION', w: nc5, align: 'center' },
            { id: 'projection_approved', label: 'PROJECTION', w: nc6, align: 'center' },
            { id: 'elevation_actual', label: 'ELEVATION', w: nc7, align: 'center' },
            { id: 'projection_actual', label: 'PROJECTION', w: nc8, align: 'center' }
        ];

        const drawNozzleHeader = (y) => {
            y = this.drawSectionBanner(doc, startX, y, width, 'NOZZLE DETAILS');
            const hTop = 14;
            const hSub = 13;
            const totalH = hTop + hSub;

            this.drawBox(doc, startX, y, width, totalH, 0.8, this.colors.headerBg);

            // Standalone columns
            let tx = startX;
            [
                { label: 'NOZZLE\nMARK', w: nc1 },
                { label: 'ORIENTATION', w: nc2 },
                { label: 'SIZE', w: nc3 }
            ].forEach(col => {
                this.drawLine(doc, tx + col.w, y, tx + col.w, y + totalH, 0.5);
                doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                    .text(col.label, tx + 1, y + 8, { width: col.w - 2, align: 'center', lineGap: 1 });
                tx += col.w;
            });

            // Group: APPROVED DRAWING
            const appW = nc4 + nc5 + nc6;
            this.drawLine(doc, tx, y + hTop, tx + appW, y + hTop, 0.5);
            this.drawLine(doc, tx + appW, y, tx + appW, y + totalH, 0.5);
            doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                .text('DIMENSION AS PER APPROVED DRAWING', tx, y + 3.5, { width: appW, align: 'center' });

            this.drawLine(doc, tx + nc4, y + hTop, tx + nc4, y + totalH, 0.5);
            this.drawLine(doc, tx + nc4 + nc5, y + hTop, tx + nc4 + nc5, y + totalH, 0.5);
            doc.fontSize(6)
                .text('LOCATION', tx, y + hTop + 3.5, { width: nc4, align: 'center' })
                .text('ELEVATION', tx + nc4, y + hTop + 3.5, { width: nc5, align: 'center' })
                .text('PROJECTION', tx + nc4 + nc5, y + hTop + 3.5, { width: nc6, align: 'center' });

            // Group: ACTUAL MEASURE
            const actX = tx + appW;
            const actW = nc7 + nc8;
            this.drawLine(doc, actX, y + hTop, actX + actW, y + hTop, 0.5);
            doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                .text('DIMENSION AT ACTUAL MEASURE', actX, y + 3.5, { width: actW, align: 'center' });

            this.drawLine(doc, actX + nc7, y + hTop, actX + nc7, y + totalH, 0.5);
            doc.fontSize(6)
                .text('ELEVATION', actX, y + hTop + 3.5, { width: nc7, align: 'center' })
                .text('PROJECTION', actX + nc7, y + hTop + 3.5, { width: nc8, align: 'center' });

            return y + totalH;
        };

        checkPageBreak(45, drawNozzleHeader);
        curY = drawNozzleHeader(curY);

        const nozzles = data.nozzles || [];
        if (nozzles.length === 0) {
            const emptyH = 18;
            this.drawBox(doc, startX, curY, width, emptyH, 0.4);
            doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                .text('No nozzle records available.', startX, curY + 5, { width: width, align: 'center' });
            curY += emptyH;
        } else {
            nozzles.forEach((nz, idx) => {
                const cellValues = [
                    this.formatText(nz.nozzle_mark),
                    this.formatText(nz.orientation),
                    this.formatText(nz.size),
                    this.formatText(nz.location),
                    this.formatText(nz.elevation_approved),
                    this.formatText(nz.projection_approved),
                    this.formatText(nz.elevation_actual),
                    this.formatText(nz.projection_actual)
                ];

                let maxH = 8;
                nozzleCols.forEach((col, cIdx) => {
                    const paddingX = col.align === 'center' ? 2 : 4;
                    doc.font(cIdx === 0 ? this.fonts.bold : this.fonts.regular).fontSize(6.5);
                    const h = doc.heightOfString(cellValues[cIdx], { width: col.w - (paddingX * 2), lineGap: 1 });
                    if (h > maxH) maxH = h;
                });
                const rowH = Math.max(16, maxH + 7);

                checkPageBreak(rowH, drawNozzleHeader);

                const rowBg = idx % 2 === 1 ? this.colors.zebraBg : null;
                this.drawBox(doc, startX, curY, width, rowH, 0.4, rowBg);

                let tx = startX;
                nozzleCols.forEach((col, cIdx) => {
                    if (cIdx < nozzleCols.length - 1) {
                        this.drawLine(doc, tx + col.w, curY, tx + col.w, curY + rowH, 0.4);
                    }
                    const paddingX = col.align === 'center' ? 2 : 4;
                    const font = cIdx === 0 ? this.fonts.bold : this.fonts.regular;
                    doc.font(font).fontSize(6.5).fillColor(this.colors.black)
                        .text(cellValues[cIdx], tx + paddingX, curY + 3.5, {
                            width: col.w - (paddingX * 2),
                            align: col.align,
                            lineBreak: true,
                            lineGap: 1
                        });
                    tx += col.w;
                });

                curY += rowH;
            });
        }
        curY += 6;

        // ═════════════════════════════════════════════════════════════════════
        // 3. PART DETAILS TABLE
        // ═════════════════════════════════════════════════════════════════════
        const pc1 = 55, pc2 = 175, pc3 = 65, pc4 = 60, pc5 = 50, pc6 = 65;
        const pc7 = width - (pc1 + pc2 + pc3 + pc4 + pc5 + pc6);
        const partCols = [
            { id: 'part_no', label: 'PART NO', w: pc1, align: 'center' },
            { id: 'description', label: 'DESCRIPTION', w: pc2, align: 'left' },
            { id: 'orientation_approved', label: 'ORIENTATION', w: pc3, align: 'center' },
            { id: 'elevation_approved', label: 'ELEVATION', w: pc4, align: 'center' },
            { id: 'projection_approved', label: 'PROJECTION', w: pc5, align: 'center' },
            { id: 'elevation_actual', label: 'ELEVATION', w: pc6, align: 'center' },
            { id: 'projection_actual', label: 'PROJECTION', w: pc7, align: 'center' }
        ];

        const drawPartHeader = (y) => {
            y = this.drawSectionBanner(doc, startX, y, width, 'PART DETAILS');
            const hTop = 14;
            const hSub = 13;
            const totalH = hTop + hSub;

            this.drawBox(doc, startX, y, width, totalH, 0.8, this.colors.headerBg);

            // Standalone columns
            let tx = startX;
            [
                { label: 'PART NO', w: pc1 },
                { label: 'DESCRIPTION', w: pc2 }
            ].forEach(col => {
                this.drawLine(doc, tx + col.w, y, tx + col.w, y + totalH, 0.5);
                doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                    .text(col.label, tx + 1, y + 8, { width: col.w - 2, align: 'center', lineGap: 1 });
                tx += col.w;
            });

            // Group: APPROVED DRAWING
            const appW = pc3 + pc4 + pc5;
            this.drawLine(doc, tx, y + hTop, tx + appW, y + hTop, 0.5);
            this.drawLine(doc, tx + appW, y, tx + appW, y + totalH, 0.5);
            doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                .text('DIMENSION AS PER APPROVED DRAWING', tx, y + 3.5, { width: appW, align: 'center' });

            this.drawLine(doc, tx + pc3, y + hTop, tx + pc3, y + totalH, 0.5);
            this.drawLine(doc, tx + pc3 + pc4, y + hTop, tx + pc3 + pc4, y + totalH, 0.5);
            doc.fontSize(6)
                .text('ORIENTATION', tx, y + hTop + 3.5, { width: pc3, align: 'center' })
                .text('ELEVATION', tx + pc3, y + hTop + 3.5, { width: pc4, align: 'center' })
                .text('PROJECTION', tx + pc3 + pc4, y + hTop + 3.5, { width: pc5, align: 'center' });

            // Group: ACTUAL MEASURE
            const actX = tx + appW;
            const actW = pc6 + pc7;
            this.drawLine(doc, actX, y + hTop, actX + actW, y + hTop, 0.5);
            doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                .text('DIMENSION AT ACTUAL MEASURE', actX, y + 3.5, { width: actW, align: 'center' });

            this.drawLine(doc, actX + pc6, y + hTop, actX + pc6, y + totalH, 0.5);
            doc.fontSize(6)
                .text('ELEVATION', actX, y + hTop + 3.5, { width: pc6, align: 'center' })
                .text('PROJECTION', actX + pc6, y + hTop + 3.5, { width: pc7, align: 'center' });

            return y + totalH;
        };

        checkPageBreak(45, drawPartHeader);
        curY = drawPartHeader(curY);

        const parts = data.parts || [];
        if (parts.length === 0) {
            const emptyH = 18;
            this.drawBox(doc, startX, curY, width, emptyH, 0.4);
            doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                .text('No part records available.', startX, curY + 5, { width: width, align: 'center' });
            curY += emptyH;
        } else {
            parts.forEach((pt, idx) => {
                const cellValues = [
                    this.formatText(pt.part_no),
                    this.formatText(pt.description),
                    this.formatText(pt.orientation_approved),
                    this.formatText(pt.elevation_approved),
                    this.formatText(pt.projection_approved),
                    this.formatText(pt.elevation_actual),
                    this.formatText(pt.projection_actual)
                ];

                let maxH = 8;
                partCols.forEach((col, cIdx) => {
                    const paddingX = col.align === 'center' ? 2 : 4;
                    doc.font(cIdx === 0 ? this.fonts.bold : this.fonts.regular).fontSize(6.5);
                    const h = doc.heightOfString(cellValues[cIdx], { width: col.w - (paddingX * 2), lineGap: 1 });
                    if (h > maxH) maxH = h;
                });
                const rowH = Math.max(16, maxH + 7);

                checkPageBreak(rowH, drawPartHeader);

                const rowBg = idx % 2 === 1 ? this.colors.zebraBg : null;
                this.drawBox(doc, startX, curY, width, rowH, 0.4, rowBg);

                let tx = startX;
                partCols.forEach((col, cIdx) => {
                    if (cIdx < partCols.length - 1) {
                        this.drawLine(doc, tx + col.w, curY, tx + col.w, curY + rowH, 0.4);
                    }
                    const paddingX = col.align === 'center' ? 2 : 4;
                    const font = cIdx === 0 ? this.fonts.bold : this.fonts.regular;
                    doc.font(font).fontSize(6.5).fillColor(this.colors.black)
                        .text(cellValues[cIdx], tx + paddingX, curY + 3.5, {
                            width: col.w - (paddingX * 2),
                            align: col.align,
                            lineBreak: true,
                            lineGap: 1
                        });
                    tx += col.w;
                });

                curY += rowH;
            });
        }
        curY += 6;

        // ═════════════════════════════════════════════════════════════════════
        // 4. REMARKS SECTION
        // ═════════════════════════════════════════════════════════════════════
        const drawRemarksHeader = (y) => {
            return this.drawSectionBanner(doc, startX, y, width, 'REMARKS');
        };

        const remarks = data.remarks || [];
        if (remarks.length > 0) {
            checkPageBreak(35, drawRemarksHeader);
            curY = drawRemarksHeader(curY);

            const idxW = 35;
            const textW = width - idxW;

            remarks.forEach((rem, idx) => {
                const remText = this.formatText(rem.text);
                doc.font(this.fonts.regular).fontSize(7);
                const textH = doc.heightOfString(remText, { width: textW - 8, lineGap: 1 });
                const rowH = Math.max(16, textH + 7);

                checkPageBreak(rowH, drawRemarksHeader);

                this.drawBox(doc, startX, curY, width, rowH, 0.4);
                this.drawLine(doc, startX + idxW, curY, startX + idxW, curY + rowH, 0.4);

                doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                    .text(String(idx + 1), startX, curY + 4, { width: idxW, align: 'center' });

                doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
                    .text(remText, startX + idxW + 4, curY + 4, { width: textW - 8, align: 'left', lineBreak: true, lineGap: 1 });

                curY += rowH;
            });
            curY += 6;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 5. INSTRUMENT CALIBRATION DETAILS
        // ═════════════════════════════════════════════════════════════════════
        const instBannerH = 16;
        const instHeadH = 14;
        const instruments = (data.instruments || []).slice(0, 3);
        const instRows = [
            { label: 'INSTRUMENT NAME:', field: 'name' },
            { label: 'ID NO. / SR NO.:', field: 'id_no' },
            { label: 'CALIBRATION DUE DATE:', field: 'due_date' }
        ];

        const lblColW = 145;
        const instColW = (width - lblColW) / 3;

        const instRowHeights = instRows.map(iRow => {
            let maxH = 8;
            [0, 1, 2].forEach(colIdx => {
                const inst = instruments[colIdx];
                let val = '-';
                if (inst) {
                    val = inst[iRow.field] || '-';
                    if (iRow.field === 'due_date' && val !== '-') {
                        val = this.formatDate(val);
                    }
                }
                doc.font(this.fonts.regular).fontSize(6.5);
                const h = doc.heightOfString(String(val), { width: instColW - 4, lineGap: 1 });
                if (h > maxH) maxH = h;
            });
            return Math.max(15, maxH + 6);
        });

        const totalInstH = instBannerH + instHeadH + instRowHeights.reduce((a, b) => a + b, 0);
        const sigH = 90; // Clean, fixed standard signature block height (~90pt)

        // If instruments don't fit on this page, or if remaining space is too tight for instruments + signature,
        // break cleanly to new page so instrument table is never fragmented
        if (curY + totalInstH > maxY || (curY + totalInstH + 10 + sigH > bottomLineY && curY > 200)) {
            doc.addPage({
                margins: { top: 30, bottom: 25, left: 30, right: 30 },
                size: 'A4',
                layout: 'portrait'
            });
            curY = 30;
            curY = this.drawCompactHeader(doc, startX, curY, width, data, companyInfo);
            curY += 6;
        }

        curY = this.drawSectionBanner(doc, startX, curY, width, 'INSTRUMENT CALIBRATION DETAILS');

        // Instruments sub-header
        this.drawBox(doc, startX, curY, width, instHeadH, 0.5, this.colors.headerBg);
        this.drawLine(doc, startX + lblColW, curY, startX + lblColW, curY + instHeadH, 0.5);
        this.drawLine(doc, startX + lblColW + instColW, curY, startX + lblColW + instColW, curY + instHeadH, 0.5);
        this.drawLine(doc, startX + lblColW + (2 * instColW), curY, startX + lblColW + (2 * instColW), curY + instHeadH, 0.5);

        doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
            .text('PARAMETER', startX + 5, curY + 4, { width: lblColW - 10, align: 'left' })
            .text('1', startX + lblColW, curY + 4, { width: instColW, align: 'center' })
            .text('2', startX + lblColW + instColW, curY + 4, { width: instColW, align: 'center' })
            .text('3', startX + lblColW + (2 * instColW), curY + 4, { width: instColW, align: 'center' });
        curY += instHeadH;

        instRows.forEach((iRow, rIdx) => {
            const rowH = instRowHeights[rIdx];
            this.drawBox(doc, startX, curY, width, rowH, 0.4);
            this.drawLine(doc, startX + lblColW, curY, startX + lblColW, curY + rowH, 0.4);
            this.drawLine(doc, startX + lblColW + instColW, curY, startX + lblColW + instColW, curY + rowH, 0.4);
            this.drawLine(doc, startX + lblColW + (2 * instColW), curY, startX + lblColW + (2 * instColW), curY + rowH, 0.4);

            doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                .text(iRow.label, startX + 5, curY + 4, { width: lblColW - 10, align: 'left' });

            [0, 1, 2].forEach(colIdx => {
                const inst = instruments[colIdx];
                let val = '-';
                if (inst) {
                    val = inst[iRow.field] || '-';
                    if (iRow.field === 'due_date' && val !== '-') {
                        val = this.formatDate(val);
                    }
                }
                const cellX = startX + lblColW + (colIdx * instColW);
                doc.font(this.fonts.regular).fontSize(6.5).fillColor(this.colors.black)
                    .text(String(val), cellX + 2, curY + 4, { width: instColW - 4, align: 'center', lineBreak: true, lineGap: 1 });
            });

            curY += rowH;
        });
        curY += 8;

        // ═════════════════════════════════════════════════════════════════════
        // 6. SIGNATURES SECTION (Original 3-column layout, docked to bottom)
        // ═════════════════════════════════════════════════════════════════════
        if (curY + 10 + sigH > bottomLineY) {
            doc.addPage({
                margins: { top: 30, bottom: 25, left: 30, right: 30 },
                size: 'A4',
                layout: 'portrait'
            });
            curY = 30;
            curY = this.drawCompactHeader(doc, startX, curY, width, data, companyInfo);
        }

        const sigY = bottomLineY - sigH;
        const sigW = width / 3;

        doc.lineWidth(0.5).strokeColor(this.colors.border);
        doc.rect(startX, sigY, width, sigH).stroke();
        doc.moveTo(startX + sigW, sigY).lineTo(startX + sigW, bottomLineY).stroke();
        doc.moveTo(startX + 2 * sigW, sigY).lineTo(startX + 2 * sigW, bottomLineY).stroke();

        doc.font(this.fonts.bold).fontSize(9.5).fillColor(this.colors.black);
        const sigLabelY = bottomLineY - 18;
        doc.text('SEL QC', startX, sigLabelY, { width: sigW, align: 'center' });
        doc.text('AI / TPI', startX + sigW, sigLabelY, { width: sigW, align: 'center' });
        doc.text('CLIENT', startX + 2 * sigW, sigLabelY, { width: sigW, align: 'center' });

        // ═════════════════════════════════════════════════════════════════════
        // 7. FOOTER (Original layout on all pages with page numbers)
        // ═════════════════════════════════════════════════════════════════════
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const originalBottomMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;

            const footerY = bottomLineY + 5;

            doc.fontSize(7).fillColor(this.colors.black).font(this.fonts.regular);
            doc.text('EXHIBIT 10/3', startX, footerY, { lineBreak: false });
            doc.text('GENERAL INSPECTION REPORT', startX, footerY, { width: width, align: 'center', lineBreak: false });
            doc.text(`REV.: R1   Page ${i + 1} of ${range.count}`, startX, footerY, { width: width, align: 'right', lineBreak: false });

            doc.page.margins.bottom = originalBottomMargin;
        }

        doc.end();
    }
}

module.exports = new FinalInspectionPdfGenerator();
