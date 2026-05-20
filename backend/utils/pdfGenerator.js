const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Generator for Joint Types A & B
 * Matches client's "Seam Welding Report" template exactly:
 * - Outer page border, Header (Logo + Title + Report No), Info Grid, then main table
 * - RED (#FF0000) bold labels, black regular values
 */
class PDFGenerator {
    constructor() {
        this.colors = { red: '#FF0000', black: '#000000', darkBlue: '#000080', white: '#FFFFFF' };
        this.fonts = { regular: 'Helvetica', bold: 'Helvetica-Bold' };
    }

    drawLogo(doc, x, y, w, h, companyInfo) {
        if (companyInfo && companyInfo.logoPath && fs.existsSync(companyInfo.logoPath)) {
            doc.image(companyInfo.logoPath, x + 5, y + 5, { fit: [w - 10, h - 10], align: 'center', valign: 'center' });
            return;
        }
        if (companyInfo && companyInfo.name) {
            doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.darkBlue)
                .text(companyInfo.name, x, y + h / 2 - 6, { width: w, align: 'center' });
        }
    }

    generateStage1Report(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);
        this._drawSeamReport(doc, { stage1: data }, companyInfo);
        doc.end();
    }

    generateCompleteReport(allStagesData, res, companyInfo) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);
        this._drawSeamReport(doc, allStagesData, companyInfo);
        doc.end();
    }

    // ==========================================
    // CORE: Draw the full Seam Welding Report
    // ==========================================
    _drawSeamReport(doc, allStagesData, companyInfo) {
        const startX = 25, startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        // Outer page border
        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
        doc.lineWidth(0.5);

        let currentY = startY + 5;
        const innerW = pageW - 10;
        const innerX = startX + 5;

        const firstData = allStagesData.stage1 || Object.values(allStagesData)[0] || {};

        // ===== HEADER: Logo + Title + Report No =====
        currentY = this._drawHeader(doc, innerX, currentY, innerW, firstData, 'SET UP & WELD VISUAL INSPECTION REPORT', companyInfo);

        // ===== INFO GRID: MSN, Client, PO, etc. =====
        currentY = this._drawInfoGrid(doc, innerX, currentY, innerW, firstData);

        currentY += 10; // Gap between info grid and main table

        // ===== MAIN TABLE: Long Seam Inspection =====
        // Column widths for the 4-column inspection table
        const col1W = innerW * 0.30;
        const col2W = innerW * 0.23;
        const col3W = innerW * 0.23;
        const col4W = innerW - col1W - col2W - col3W;
        const colWidths = [col1W, col2W, col3W, col4W];
        const rowH = 18;
        const pad = 4;

        // Title row
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 24,
            'LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT',
            { font: this.fonts.bold, fontSize: 11, color: this.colors.black, align: 'center' });

        // Joint Number row
        const s1 = allStagesData.stage1 || {};
        currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
            { t: 'Joint Number', f: this.fonts.bold, c: this.colors.red },
            { t: s1.jointDescription || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.jointNo || '-', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);

        // Inspection characteristic rows (Stage 1)
        const inspRows = s1.inspectionRows || [];
        const chars = [
            'Material Identification', 'Weld joint configuration', 'Root Gap',
            'Root Face', 'Degree for "V"', 'Offset', 'Alignment',
            'Weld edge Visual', 'Length of the Shell', 'Outside circumference',
            'Inside Gauge / Template Verification',
            'Outside Gauge / Template verification (if Applicable)',
            'Tack Welder Number'
        ];

        chars.forEach((name, idx) => {
            const rd = inspRows.find(r => r.name === name) || inspRows[idx] || {};
            currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
                { t: name, f: this.fonts.bold, c: this.colors.red },
                { t: rd.value || '', f: this.fonts.regular, c: this.colors.black },
                { t: '', f: this.fonts.regular, c: this.colors.black },
                { t: '' }
            ]);
        });

        // Stage 1 signature
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Set Up Inspection by',
            { font: this.fonts.bold, fontSize: 12, color: this.colors.red, align: 'center' });
        currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s1, 'QC Engineer');

        // ===== STAGE 2: Back Chip =====
        currentY = this._pageCheck(doc, currentY, 140, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
        const s2 = allStagesData.stage2 || null;

        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Back chip – Required / not required',
            { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });

        currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
            { t: 'Back Chip PT', f: this.fonts.bold, c: this.colors.red },
            { t: 'YES / No', f: this.fonts.bold, c: this.colors.red },
            { t: firstData.backChipReq ? 'YES' : 'NO', f: this.fonts.bold, c: this.colors.black },
            { t: '' }
        ]);

        if (s2) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s2, 'QC Engineer');

        // ===== STAGE 3: Weld Visual =====
        currentY = this._pageCheck(doc, currentY, 160, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
        const s3 = allStagesData.stage3 || null;

        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Weld Visual Inspection by',
            { font: this.fonts.bold, fontSize: 12, color: this.colors.red, align: 'center' });

        currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
            { t: 'Welder No.', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: s3?.welderNo || s3?.welderNumber || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);

        currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
            { t: 'Welding process', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: s3?.weldingProcess || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);

        if (s3) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s3, 'QC Engineer');

        // ===== STAGE 4: RT =====
        currentY = this._pageCheck(doc, currentY, 100, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
        const s4 = allStagesData.stage4 || null;
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Radiography Testing Requirement',
            { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
        if (s4) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s4, 'NDT Engineer');

        // ===== STAGE 5: PT =====
        currentY = this._pageCheck(doc, currentY, 100, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
        const s5 = allStagesData.stage5 || null;
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Liquid Penetrant Testing (Required / Not required)',
            { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
        if (s5) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s5, 'NDT Engineer');

        // ===== STAGE 6: PWHT + RT After PWHT =====
        currentY = this._pageCheck(doc, currentY, 100, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
        const s6 = allStagesData.stage6 || null;
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'PWHT (Required / Not required)',
            { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Radiography Testing Requirement (After PWHT)',
            { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
        if (s6) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s6, 'NDT Engineer');

        // ===== STAGE 7: LP After PWHT =====
        currentY = this._pageCheck(doc, currentY, 100, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
        const s7 = allStagesData.stage7 || null;
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Liquid Penetrant Testing (Required / Not required) – After PWHT',
            { font: this.fonts.bold, fontSize: 9, color: this.colors.red, align: 'center' });
        if (s7) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s7, 'NDT Engineer');
    }

    // ==========================================
    // Header: Logo box + Title + Report No
    // ==========================================
    _drawHeader(doc, x, y, width, data, titleText, companyInfo) {
        const headerH = 70;
        doc.lineWidth(0.5).strokeColor(this.colors.black);

        const logoW = 160;
        doc.rect(x, y, logoW, headerH).stroke();
        this.drawLogo(doc, x, y, logoW, headerH, companyInfo);

        const titleBoxW = width - logoW;
        const titleRowH = 45;
        const reportRowH = 25;

        doc.rect(x + logoW, y, titleBoxW, titleRowH).stroke();
        doc.rect(x + logoW, y + titleRowH, titleBoxW, reportRowH).stroke();

        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.red)
            .text(titleText, x + logoW, y + 15, { width: titleBoxW, align: 'center' });

        const reportY = y + titleRowH + 8;
        doc.fontSize(10);
        const lbl = 'Report No : ';
        const lblW = doc.widthOfString(lbl);
        const val = data.reportNo || '-';
        const fullW = lblW + doc.widthOfString(val);
        const sx = x + logoW + (titleBoxW - fullW) / 2;
        doc.fillColor(this.colors.red).font(this.fonts.bold).text(lbl, sx, reportY, { continued: true });
        doc.fillColor(this.colors.black).font(this.fonts.regular).text(val);

        return y + headerH + 5;
    }

    // ==========================================
    // Info Grid: MSN, Client, PO, TAG, Equipment, etc.
    // ==========================================
    _drawInfoGrid(doc, x, y, width, data) {
        const rowH = 22;
        const c1 = width * 0.15, c2 = width * 0.35, c3 = width * 0.15, c4 = width * 0.35;
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
            doc.rect(x, curY, c1, rowH).stroke();
            doc.rect(x + c1, curY, c2, rowH).stroke();
            doc.rect(x + c1 + c2, curY, c3, rowH).stroke();
            doc.rect(x + c1 + c2 + c3, curY, c4, rowH).stroke();
            const tY = curY + 7;
            const p = 4;
            doc.font(this.fonts.bold).fillColor(this.colors.red);
            doc.text(row.l1, x + p, tY, { width: c1 - p * 2 });
            doc.text(row.l2, x + c1 + c2 + p, tY, { width: c3 - p * 2 });
            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(row.v1 || '', x + c1 + p, tY, { width: c2 - p * 2 });
            doc.text(row.v2 || '', x + c1 + c2 + c3 + p, tY, { width: c4 - p * 2 });
            curY += rowH;
        });
        return curY + 5;
    }

    // Full-width span row
    _fullSpanRow(doc, x, y, w, h, text, o = {}) {
        doc.rect(x, y, w, h).stroke();
        doc.font(o.font || this.fonts.bold).fontSize(o.fontSize || 10).fillColor(o.color || this.colors.black)
            .text(text, x + 4, y + (h / 2 - (o.fontSize || 10) / 2), { width: w - 8, align: o.align || 'center' });
        return y + h;
    }

    // 4-column row
    _row4(doc, x, y, ws, h, pad, cells) {
        let cx = x;
        ws.forEach((w, i) => {
            doc.rect(cx, y, w, h).stroke();
            const c = cells[i] || {};
            if (c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 9).fillColor(c.c || this.colors.black)
                    .text(c.t, cx + pad, y + (h / 2 - 4), { width: w - pad * 2 });
            }
            cx += w;
        });
        return y + h;
    }

    // Signature block
    _sigBlock(doc, x, y, ws, rh, pad, data, qcTitle) {
        // Production Engineer
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Production Engineer', f: this.fonts.bold, c: this.colors.red },
            { t: 'Name', f: this.fonts.bold, c: this.colors.red },
            { t: data.productionEngineerName || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: '' }, { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: data.submissionDate || '', f: this.fonts.regular, c: this.colors.black }, { t: '' }
        ]);
        // QC/NDT Engineer
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: qcTitle, f: this.fonts.bold, c: this.colors.red },
            { t: 'Name', f: this.fonts.bold, c: this.colors.red },
            { t: data.qcEngineerName || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: '' }, { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: data.qcDate || '', f: this.fonts.regular, c: this.colors.black }, { t: '' }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: '' }, { t: 'Sign', f: this.fonts.bold, c: this.colors.red },
            { t: data.qcStatus === 'approved' ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black }, { t: '' }
        ]);
        // AI / CLIENT / TPIA
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'AI / CLIENT / TPIA', f: this.fonts.bold, c: this.colors.red },
            { t: 'Name', f: this.fonts.bold, c: this.colors.red }, { t: '' }, { t: '' }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: '' }, { t: 'Date', f: this.fonts.bold, c: this.colors.red }, { t: '' }, { t: '' }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: '' }, { t: 'Sign', f: this.fonts.bold, c: this.colors.red }, { t: '' }, { t: '' }
        ]);
        return y;
    }

    // Page break check — adds new page with outer border + header + info grid
    _pageCheck(doc, y, needed, startX, pageW, pageH, innerX, innerW, data, companyInfo) {
        if (y + needed > startX + pageH - 10) {
            doc.addPage();
            doc.rect(startX, startX, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
            doc.lineWidth(0.5);
            let ny = startX + 5;
            ny = this._drawHeader(doc, innerX, ny, innerW, data, 'SET UP & WELD VISUAL INSPECTION REPORT', companyInfo);
            ny = this._drawInfoGrid(doc, innerX, ny, innerW, data);
            return ny + 5;
        }
        return y;
    }
}

module.exports = new PDFGenerator();
