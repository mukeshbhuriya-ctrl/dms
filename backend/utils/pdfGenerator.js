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
        const logoPath = path.join(__dirname, '..', 'assets', 'shreno-logo.png');
        
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, x + 5, y + 5, { fit: [w - 10, h - 10], align: 'center', valign: 'center' });
        } else if (companyInfo && companyInfo.name) {
            doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.darkBlue)
                .text(companyInfo.name, x, y + h / 2 - 6, { width: w, align: 'center' });
        }
    }

    generateStage1Report(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);
        this._drawSeamReport(doc, { stage1: data }, companyInfo);
        this._addFooters(doc);
        doc.end();
    }

    generateCompleteReport(allStagesData, res, companyInfo) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);
        this._drawSeamReport(doc, allStagesData, companyInfo);
        this._addFooters(doc);
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

        const firstDataObj = allStagesData.stage1 || Object.values(allStagesData)[0] || {};
        const firstDataJoints = firstDataObj.joints || (firstDataObj.jointNo ? [firstDataObj] : []);
        const firstData = firstDataJoints[0] || {};

        // ===== HEADER: Logo + Title + Report No =====
        currentY = this._drawHeader(doc, innerX, currentY, innerW, firstData, 'SET UP & WELD VISUAL INSPECTION REPORT', companyInfo);

        // ===== INFO GRID: MSN, Client, PO, etc. =====
        currentY = this._drawInfoGrid(doc, innerX, currentY, innerW, firstData);

        currentY += 10; // Gap between info grid and main table

        // ===== MAIN TABLE: Long Seam Inspection =====
        // Column widths for the 3-column inspection table
        const col1W = innerW * 0.40;
        const col2W = innerW * 0.20;
        const col3W = innerW * 0.20;
        const col4W = innerW - col1W - col2W - col3W;
        const colWidths = [col1W, col2W, col3W, col4W];
        const rowH = 18;
        const pad = 4;

        // Title row
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 24,
            'LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT',
            { font: this.fonts.bold, fontSize: 11, color: this.colors.black, align: 'center' });

        // Joint Number row — value in col2 aligned with other data rows
        const s1_obj = allStagesData.stage1 || {};
        const s1_joints = s1_obj.joints || (s1_obj.jointNo ? [s1_obj] : []);
        const s1_0 = s1_joints[0] || {};
        const s1_1 = s1_joints[1] || {};
        const s1_2 = s1_joints[2] || {};
        const s1 = s1_joints.length > 0 ? s1_obj : null;
        currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
            { t: 'Joint Number', f: this.fonts.bold, c: this.colors.red },
            { t: s1_0.jointNo || '-', f: this.fonts.regular, c: this.colors.black },
            { t: s1_1.jointNo || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1_2.jointNo || '', f: this.fonts.regular, c: this.colors.black }
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
                { t: (s1_0.inspectionRows?.find(r => r.name === name) || {}).value || '', f: this.fonts.regular, c: this.colors.black },
                  { t: (s1_1.inspectionRows?.find(r => r.name === name) || {}).value || '', f: this.fonts.regular, c: this.colors.black },
                  { t: (s1_2.inspectionRows?.find(r => r.name === name) || {}).value || '', f: this.fonts.regular, c: this.colors.black }
            ]);
        });

        // Stage 1 signature
        currentY = this._pageCheck(doc, currentY, 190, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Set Up Inspection by',
            { font: this.fonts.bold, fontSize: 12, color: this.colors.red, align: 'center' });
        currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s1, 'QC Engineer');

        // ===== STAGE 2: Back Chip =====
        if (firstData.backChipReq) {
            const s2_obj = allStagesData.stage2 || {};
        const s2_joints = s2_obj.joints || (s2_obj.jointNo ? [s2_obj] : []);
        const s2_0 = s2_joints[0] || {};
        const s2_1 = s2_joints[1] || {};
        const s2_2 = s2_joints[2] || {};
        const s2 = s2_joints.length > 0 ? s2_obj : null;
            currentY = this._pageCheck(doc, currentY, s2 ? 190 : 80, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);

            currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
                'Back chip',
                { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });

            currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
                { t: 'Back Chip PT: YES / No', f: this.fonts.bold, c: this.colors.red },
                { t: s1_0.backChipReq ? 'YES' : 'NO', f: this.fonts.bold, c: this.colors.black },
                { t: s1_1.jointNo ? (s1_1.backChipReq ? 'YES' : 'NO') : '', f: this.fonts.bold, c: this.colors.black },
                { t: s1_2.jointNo ? (s1_2.backChipReq ? 'YES' : 'NO') : '', f: this.fonts.bold, c: this.colors.black }
            ]);

            if (s2) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s2, 'QC Engineer');
        }

        // ===== STAGE 3: Weld Visual =====
        const s3_obj = allStagesData.stage3 || {};
        const s3_joints = s3_obj.joints || (s3_obj.jointNo ? [s3_obj] : []);
        const s3_0 = s3_joints[0] || {};
        const s3_1 = s3_joints[1] || {};
        const s3_2 = s3_joints[2] || {};
        const s3 = s3_joints.length > 0 ? s3_obj : null;
        currentY = this._pageCheck(doc, currentY, s3 ? 190 : 80, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);

        currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
            'Weld Visual Inspection by',
            { font: this.fonts.bold, fontSize: 12, color: this.colors.red, align: 'center' });

        currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
            { t: 'Welder No.', f: this.fonts.bold, c: this.colors.red },
            { t: s3_0.welderNo || s3_0.welderNumber || '', f: this.fonts.regular, c: this.colors.black },
            { t: s3_1.welderNo || s3_1.welderNumber || '', f: this.fonts.regular, c: this.colors.black },
            { t: s3_2.welderNo || s3_2.welderNumber || '', f: this.fonts.regular, c: this.colors.black }
        ]);

        currentY = this._row4(doc, innerX, currentY, colWidths, rowH, pad, [
            { t: 'Welding process', f: this.fonts.bold, c: this.colors.red },
            { t: s3_0.weldingProcess || '', f: this.fonts.regular, c: this.colors.black },
            { t: s3_1.weldingProcess || '', f: this.fonts.regular, c: this.colors.black },
            { t: s3_2.weldingProcess || '', f: this.fonts.regular, c: this.colors.black }
        ]);

        if (s3) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s3, 'QC Engineer');

        // ===== STAGE 4: RT =====
        if (firstData.rt) {
            const s4_obj = allStagesData.stage4 || {};
        const s4_joints = s4_obj.joints || (s4_obj.jointNo ? [s4_obj] : []);
        const s4_0 = s4_joints[0] || {};
        const s4_1 = s4_joints[1] || {};
        const s4_2 = s4_joints[2] || {};
        const s4 = s4_joints.length > 0 ? s4_obj : null;
            currentY = this._pageCheck(doc, currentY, s4 ? 190 : 40, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
            currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
                'Radiography Testing Requirement',
                { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
            if (s4) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s4, 'NDT Engineer');
        }

        // ===== STAGE 5: PT =====
        if (firstData.pt) {
            const s5_obj = allStagesData.stage5 || {};
        const s5_joints = s5_obj.joints || (s5_obj.jointNo ? [s5_obj] : []);
        const s5_0 = s5_joints[0] || {};
        const s5_1 = s5_joints[1] || {};
        const s5_2 = s5_joints[2] || {};
        const s5 = s5_joints.length > 0 ? s5_obj : null;
            currentY = this._pageCheck(doc, currentY, s5 ? 190 : 40, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
            currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
                'Liquid Penetrant Testing',
                { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
            if (s5) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s5, 'NDT Engineer');
        }

        // ===== STAGE 6 & 7: PWHT + RT/PT After PWHT =====
        if (firstData.pwht) {
            const s6_obj = allStagesData.stage6 || {};
        const s6_joints = s6_obj.joints || (s6_obj.jointNo ? [s6_obj] : []);
        const s6_0 = s6_joints[0] || {};
        const s6_1 = s6_joints[1] || {};
        const s6_2 = s6_joints[2] || {};
        const s6 = s6_joints.length > 0 ? s6_obj : null;
            currentY = this._pageCheck(doc, currentY, s6 ? 190 : 60, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
            currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
                'PWHT',
                { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
            currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
                'Radiography Testing Requirement (After PWHT)',
                { font: this.fonts.bold, fontSize: 11, color: this.colors.red, align: 'center' });
            if (s6) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s6, 'NDT Engineer');

            const s7_obj = allStagesData.stage7 || {};
        const s7_joints = s7_obj.joints || (s7_obj.jointNo ? [s7_obj] : []);
        const s7_0 = s7_joints[0] || {};
        const s7_1 = s7_joints[1] || {};
        const s7_2 = s7_joints[2] || {};
        const s7 = s7_joints.length > 0 ? s7_obj : null;
            currentY = this._pageCheck(doc, currentY, s7 ? 190 : 40, startX, pageW, pageH, innerX, innerW, firstData, companyInfo);
            currentY = this._fullSpanRow(doc, innerX, currentY, innerW, 22,
                'Liquid Penetrant Testing – After PWHT',
                { font: this.fonts.bold, fontSize: 9, color: this.colors.red, align: 'center' });
            if (s7) currentY = this._sigBlock(doc, innerX, currentY, colWidths, rowH, pad, s7, 'NDT Engineer');
        }
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

        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.darkBlue)
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

    // 4-column row — dynamic height based on tallest cell text
    _row4(doc, x, y, ws, minH, pad, cells) {
        // Measure required height for each cell
        let maxTextH = 0;
        cells.forEach((c, i) => {
            if (c && c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 9);
                const textH = doc.heightOfString(c.t, { width: ws[i] - pad * 2 });
                if (textH > maxTextH) maxTextH = textH;
            }
        });
        const h = Math.max(minH, maxTextH + 8);

        let cx = x;
        ws.forEach((w, i) => {
            doc.rect(cx, y, w, h).stroke();
            const c = cells[i] || {};
            if (c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 9).fillColor(c.c || this.colors.black)
                    .text(c.t, cx + pad, y + 4, { width: w - pad * 2 });
            }
            cx += w;
        });
        return y + h;
    }

    // Signature block
    _sigBlock(doc, x, y, ws, rh, pad, data, qcTitle) {
        const joints = data.joints || (data.jointNo ? [data] : []);
        const j0 = joints[0] || {};
        const j1 = joints[1] || {};
        const j2 = joints[2] || {};

        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Remarks', f: this.fonts.bold, c: this.colors.red },
            { t: j0.remarks || '', f: this.fonts.regular, c: this.colors.black },
            { t: j1.remarks || '', f: this.fonts.regular, c: this.colors.black },
            { t: j2.remarks || '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // Production Engineer
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Production Engineer: Name', f: this.fonts.bold, c: this.colors.red },
            { t: j0.productionEngineerName || '', f: this.fonts.regular, c: this.colors.black },
            { t: j1.productionEngineerName || '', f: this.fonts.regular, c: this.colors.black },
            { t: j2.productionEngineerName || '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: j0.submissionDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: j1.submissionDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: j2.submissionDate || '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // QC/NDT Engineer
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: qcTitle + ': Name', f: this.fonts.bold, c: this.colors.red },
            { t: j0.qcEngineerName || '', f: this.fonts.regular, c: this.colors.black },
            { t: j1.qcEngineerName || '', f: this.fonts.regular, c: this.colors.black },
            { t: j2.qcEngineerName || '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: j0.qcDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: j1.qcDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: j2.qcDate || '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Sign', f: this.fonts.bold, c: this.colors.red },
            { t: j0.qcStatus === 'approved' ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black },
            { t: j1.qcStatus === 'approved' ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black },
            { t: j2.qcStatus === 'approved' ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // AI / CLIENT / TPIA
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'AI / CLIENT / TPIA: Name', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._row4(doc, x, y, ws, rh, pad, [
            { t: 'Sign', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
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

    _addFooters(doc) {
        const range = doc.bufferedPageRange();
        const oldBottom = doc.page.margins.bottom;
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.page.margins.bottom = 0; // Prevent auto page break
            
            // Border ends at doc.page.height - 25 = 817 (assuming startY=25 and pageH=doc.page.height-50)
            const borderBottom = doc.page.height - 25;
            
            // Exhibit No INSIDE the border, bottom left side
            const exhibitY = borderBottom - 10; // 807
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                .text('EXHIBIT 10_3 GENERAL INSPECTION REPORT Rev.01', 30, exhibitY, { align: 'left', lineBreak: false });
                
            // Note OUTSIDE the border, centered in footer
            const noteY = borderBottom + 6; // 823
            doc.font(this.fonts.bold).fontSize(8).fillColor('#555555')
                .text('This is computer generated copy, hence no any signature required', 25, noteY, { width: doc.page.width - 50, align: 'center', lineBreak: false });
                
            doc.page.margins.bottom = oldBottom;
        }
    }
}

module.exports = new PDFGenerator();
