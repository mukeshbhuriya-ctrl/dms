const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Generator for Joint Types C & D
 * Matches client's "Nozzle Report" (ss4) exactly:
 * - Outer page border, Header with logo + "GENERAL INSPECTION REPORT" title
 * - Header metadata rows, Main numbered characteristics grid
 * - RED (#FF0000) bold labels, bullet points (•) for sub-items
 */
class PDFGeneratorCD {
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

    generateReport(allStagesData, res, companyInfo) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);
        this._drawNozzleReport(doc, allStagesData, companyInfo);
        this._addFooters(doc);
        doc.end();
    }

    _drawNozzleReport(doc, allStagesData, companyInfo) {
        const startX = 25, startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        // Outer page border
        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
        doc.lineWidth(0.5);

        let y = startY + 5;
        const innerW = pageW - 10;
        const x = startX + 5;

        const stage1Obj = allStagesData.stage1 || Object.values(allStagesData)[0] || {};
        const s1_joints = stage1Obj.joints || (stage1Obj.jointNo ? [stage1Obj] : []);
        const j0 = s1_joints[0] || {};
        const j1 = s1_joints[1] || {};
        const j2 = s1_joints[2] || {};
        const firstData = j0;

        // ===== HEADER =====
        const headerH = 70;
        const logoW = 160;
        doc.rect(x, y, logoW, headerH).stroke();
        this.drawLogo(doc, x, y, logoW, headerH, companyInfo);

        const titleBoxW = innerW - logoW;
        doc.rect(x + logoW, y, titleBoxW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(13).fillColor(this.colors.darkBlue)
            .text('GENERAL INSPECTION REPORT', x + logoW, y + 10, { width: titleBoxW, align: 'center' });
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.darkBlue)
            .text('(CHECK SHEET FOR', x + logoW, y + 28, { width: titleBoxW, align: 'center' });
        doc.text('NOZZLE SET-UP & WELDING INSPECTION)', x + logoW, y + 40, { width: titleBoxW, align: 'center' });
        y += headerH + 5;

        // ===== HEADER METADATA =====
        const metaRowH = 20;
        const pad = 4;
        const metaRows = [
            { l: 'Shreno Manufacturer sr. no.:', v: firstData.msn || '-' },
            { l: 'Equipment  Name & Tag Number:', v: `${firstData.equipment || ''} ${firstData.tagNo || ''}`.trim() || '-' },
            { l: 'Drawing no. :', v: firstData.drgNo || '-' }
        ];
        metaRows.forEach(r => {
            doc.rect(x, y, innerW, metaRowH).stroke();
            doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red)
                .text(r.l, x + pad, y + 5, { width: innerW * 0.4 - pad * 2 });
            doc.font(this.fonts.regular).fontSize(9).fillColor(this.colors.black)
                .text(r.v, x + innerW * 0.4 + pad, y + 5, { width: innerW * 0.6 - pad * 2 });
            y += metaRowH;
        });

        // ===== MAIN TABLE =====
        const srW = innerW * 0.07;
        const charW = innerW * 0.20;
        const detW = innerW * 0.25;
        const extW = innerW - srW - charW - detW;
        const j0W = extW * 0.333;
        const j1W = extW * 0.333;
        const j2W = extW - j0W - j1W;
        const rowH = 16;
        const ws = [srW, charW, detW, j0W, j1W, j2W];

        // Table header
        y = this._gridRow(doc, x, y, [srW, charW, detW + extW], rowH + 2, pad, [
            { t: 'Sr. No.', f: this.fonts.bold, c: this.colors.black },
            { t: 'Characteristics to be checked', f: this.fonts.bold, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // Nozzle Number row
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' },
            { t: 'Nozzle Number', f: this.fonts.bold, c: this.colors.red },
            { t: 'Joint Number', f: this.fonts.regular, c: this.colors.black },
            { t: j0.nozzleNumber || j0.jointNo || '-', f: this.fonts.bold, c: this.colors.black },
            { t: j1.nozzleNumber || j1.jointNo || '', f: this.fonts.bold, c: this.colors.black },
            { t: j2.nozzleNumber || j2.jointNo || '', f: this.fonts.bold, c: this.colors.black }
        ]);

        // ===== CHAR 1: Material identification =====
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '1', f: this.fonts.bold, c: this.colors.black },
            { t: 'Material identification Marks', f: this.fonts.bold, c: this.colors.red },
            { t: 'Available / Not Available', f: this.fonts.regular, c: this.colors.black },
            { t: j0.jointNo ? (j0.materialIdMarks || 'Available') : '' },
            { t: j1.jointNo ? (j1.materialIdMarks || 'Available') : '' },
            { t: j2.jointNo ? (j2.materialIdMarks || 'Available') : '' }
        ]);

        // ===== CHAR 2: Nozzle pipe to Flange Set-Up =====
        y = this._checkPage(doc, y, 260, startX, pageW, pageH);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '2', f: this.fonts.bold, c: this.colors.black },
            { t: 'Nozzle pipe to\nFlange Set-Up', f: this.fonts.bold, c: this.colors.red },
            { t: '• Tack Welder', f: this.fonts.bold, c: this.colors.red },
            { t: j0.tackWelder || '' },
            { t: j1.tackWelder || '' },
            { t: j2.tackWelder || '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Visual Inspection', f: this.fonts.bold, c: this.colors.red },
            { t: j0.jointNo ? (j0.visualInspection || 'OK') : '' },
            { t: j1.jointNo ? (j1.visualInspection || 'OK') : '' },
            { t: j2.jointNo ? (j2.visualInspection || 'OK') : '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Acceptance of L-Seam RT', f: this.fonts.bold, c: this.colors.red },
            { t: j0.jointNo ? (j0.lSeamRt || 'OK') : '' },
            { t: j1.jointNo ? (j1.lSeamRt || 'OK') : '' },
            { t: j2.jointNo ? (j2.lSeamRt || 'OK') : '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH + 6, pad, [
            { t: '' }, { t: '' },
            { t: '• Dimensions\n    - Nozzle Size\n    - Total Length', f: this.fonts.bold, c: this.colors.red },
            { t: j0.jointNo ? `${j0.nozzleSize || ''}\n${j0.totalLength || ''}` : '' },
            { t: j1.jointNo ? `${j1.nozzleSize || ''}\n${j1.totalLength || ''}` : '' },
            { t: j2.jointNo ? `${j2.nozzleSize || ''}\n${j2.totalLength || ''}` : '' }
        ]);

        // Signature for Char 2 (Stage 1)
        y = this._compactSig(doc, x, y, innerW, rowH, pad, stage1Obj, ws);

        // ===== CHAR 2.5: BACK CHIP (Stage 2) =====
        if (j0.backChipReq || j1.backChipReq || j2.backChipReq) {
            const s2_cd = allStagesData.stage2 || {};
            const s2_joints = s2_cd.joints || (s2_cd.jointNo ? [s2_cd] : []);
            
            y = this._checkPage(doc, y, s2_joints.length ? 260 : 80, startX, pageW, pageH);
            y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
                { t: 'Back chip - Required / not required', f: this.fonts.bold, c: this.colors.red, align: 'center' }
            ]);
            y = this._gridRow(doc, x, y, ws, rowH, pad, [
                { t: '' },
                { t: 'Back Chip PT', f: this.fonts.bold, c: this.colors.red },
                { t: 'YES / No', f: this.fonts.bold, c: this.colors.red },
                { t: j0.jointNo ? (j0.backChipReq ? 'YES' : 'NO') : '', f: this.fonts.bold, c: this.colors.black },
                { t: j1.jointNo ? (j1.backChipReq ? 'YES' : 'NO') : '', f: this.fonts.bold, c: this.colors.black },
                { t: j2.jointNo ? (j2.backChipReq ? 'YES' : 'NO') : '', f: this.fonts.bold, c: this.colors.black }
            ]);
            if (s2_joints.length) {
                y = this._sigBlockRed(doc, x, y, innerW, rowH, pad, s2_cd, ws, 'QC Engineer');
            }
        }


        // ===== CHAR 3: Weld Visual / Overlay PT =====
        y = this._checkPage(doc, y, 260, startX, pageW, pageH);
        const s3_cd = allStagesData.stage3 || {};
        const s3_joints = s3_cd.joints || (s3_cd.jointNo ? [s3_cd] : []);
        const s3_0 = s3_joints[0] || {};
        const s3_1 = s3_joints[1] || {};
        const s3_2 = s3_joints[2] || {};

        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '3', f: this.fonts.bold, c: this.colors.black },
            { t: '', f: this.fonts.bold, c: this.colors.red },
            { t: '• Overlay PT ( If applicable)', f: this.fonts.bold, c: this.colors.red },
            { t: s3_0.overlayPt || '' },
            { t: s3_1.overlayPt || '' },
            { t: s3_2.overlayPt || '' }
        ]);
        if (s3_joints.length) y = this._compactSig(doc, x, y, innerW, rowH, pad, s3_cd, ws);

        // ===== CHAR 4: Inspection Of Nozzle Opening =====
        y = this._checkPage(doc, y, 260, startX, pageW, pageH);
        const s4_cd = allStagesData.stage4 || {};
        const s4_joints = s4_cd.joints || (s4_cd.jointNo ? [s4_cd] : []);
        const s4_0 = s4_joints[0] || {};
        const s4_1 = s4_joints[1] || {};
        const s4_2 = s4_joints[2] || {};

        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '4', f: this.fonts.bold, c: this.colors.black },
            { t: 'Inspection\nOf\nNozzle Opening', f: this.fonts.bold, c: this.colors.red },
            { t: 'Opening size', f: this.fonts.bold, c: this.colors.red },
            { t: s4_0.openingSize || '' },
            { t: s4_1.openingSize || '' },
            { t: s4_2.openingSize || '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' },
            { t: 'Orientation (A°)', f: this.fonts.bold, c: this.colors.red },
            { t: s4_0.orientation || '' },
            { t: s4_1.orientation || '' },
            { t: s4_2.orientation || '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' },
            { t: 'Elevation', f: this.fonts.bold, c: this.colors.red },
            { t: s4_0.elevation || '' },
            { t: s4_1.elevation || '' },
            { t: s4_2.elevation || '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' },
            { t: 'Edge preparation', f: this.fonts.bold, c: this.colors.red },
            { t: s4_0.edgePreparation || '' },
            { t: s4_1.edgePreparation || '' },
            { t: s4_2.edgePreparation || '' }
        ]);
        if (s4_joints.length) y = this._compactSig(doc, x, y, innerW, rowH, pad, s4_cd, ws);

        // ===== CHAR 5: Nozzle Set-Up on Shell / Dish =====
        y = this._checkPage(doc, y, 260, startX, pageW, pageH);
        const s5_cd = allStagesData.stage5 || {};
        const s5_joints = s5_cd.joints || (s5_cd.jointNo ? [s5_cd] : []);
        const s5_0 = s5_joints[0] || {};
        const s5_1 = s5_joints[1] || {};
        const s5_2 = s5_joints[2] || {};

        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '5', f: this.fonts.bold, c: this.colors.black },
            { t: 'Nozzle Set-Up\non Shell / Dish\n( RF pad setup\nas applicable)', f: this.fonts.bold, c: this.colors.red },
            { t: '• Tack Welder', f: this.fonts.bold, c: this.colors.red },
            { t: s5_0.tackWelder || '' },
            { t: s5_1.tackWelder || '' },
            { t: s5_2.tackWelder || '' }
        ]);
        const s5SubRows = [
            ['• Cleaning of Nozzle & Weld Area', 'cleaning', 'OK / Not OK'],
            ['• Groove Angle', 'grooveAngle', ''],
            ['• Root face', 'rootFace', ''],
            ['• Root Gap', 'rootGap', ''],
            ['PCD hole OFF center / ON center', 'pcdHole', 'OFF center / ON center']
        ];
        s5SubRows.forEach(([label, key, defVal]) => {
            y = this._gridRow(doc, x, y, ws, rowH, pad, [
                { t: '' }, { t: '' },
                { t: label, f: this.fonts.bold, c: this.colors.red },
                { t: s5_joints.length && s5_0.jointNo ? (s5_0[key] || defVal) : '', f: this.fonts.regular, c: this.colors.black },
                { t: s5_joints.length && s5_1.jointNo ? (s5_1[key] || defVal) : '', f: this.fonts.regular, c: this.colors.black },
                { t: s5_joints.length && s5_2.jointNo ? (s5_2[key] || defVal) : '', f: this.fonts.regular, c: this.colors.black }
            ]);
        });
        if (s5_joints.length) y = this._compactSig(doc, x, y, innerW, rowH, pad, s5_cd, ws);

        // ===== CHAR 6: Inspection after full Welding =====
        y = this._checkPage(doc, y, 260, startX, pageW, pageH);
        const s6_cd = allStagesData.stage6 || {};
        const s6_joints = s6_cd.joints || (s6_cd.jointNo ? [s6_cd] : []);
        const s6_0 = s6_joints[0] || {};
        const s6_1 = s6_joints[1] || {};
        const s6_2 = s6_joints[2] || {};

        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '6', f: this.fonts.bold, c: this.colors.black },
            { t: 'Inspection after full\nWelding', f: this.fonts.bold, c: this.colors.red },
            { t: '• Visual Inspection', f: this.fonts.bold, c: this.colors.red },
            { t: s6_joints.length && s6_0.jointNo ? (s6_0.visualInspection || 'OK') : '' },
            { t: s6_joints.length && s6_1.jointNo ? (s6_1.visualInspection || 'OK') : '' },
            { t: s6_joints.length && s6_2.jointNo ? (s6_2.visualInspection || 'OK') : '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Welder No.', f: this.fonts.bold, c: this.colors.red },
            { t: s6_0.welderNo || s6_0.welderNumber || '' },
            { t: s6_1.welderNo || s6_1.welderNumber || '' },
            { t: s6_2.welderNo || s6_2.welderNumber || '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Fillet size', f: this.fonts.bold, c: this.colors.red },
            { t: s6_0.filletSize || '' },
            { t: s6_1.filletSize || '' },
            { t: s6_2.filletSize || '' }
        ]);
        if (s6_joints.length) y = this._compactSig(doc, x, y, innerW, rowH, pad, s6_cd, ws);

        // ===== CHAR 7: R.F. Pad Pneumatic =====
        y = this._checkPage(doc, y, 260, startX, pageW, pageH);
        const s7_cd = allStagesData.stage7 || {};
        const s7_joints = s7_cd.joints || (s7_cd.jointNo ? [s7_cd] : []);
        const s7_0 = s7_joints[0] || {};
        const s7_1 = s7_joints[1] || {};
        const s7_2 = s7_joints[2] || {};

        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '7', f: this.fonts.bold, c: this.colors.black },
            { t: 'R.F. Pad Pneumatic.\n(Applicable / Not Applicable)', f: this.fonts.bold, c: this.colors.red },
            { t: s7_joints.length && s7_0.jointNo ? (s7_0.rfPadPneumatic || 'OK') : '', f: this.fonts.regular, c: this.colors.black },
            { t: s7_joints.length && s7_1.jointNo ? (s7_1.rfPadPneumatic || 'OK') : '' },
            { t: s7_joints.length && s7_2.jointNo ? (s7_2.rfPadPneumatic || 'OK') : '' },
            { t: '' }
        ]);
        if (s7_joints.length) y = this._compactSig(doc, x, y, innerW, rowH, pad, s7_cd, ws);

        
        // ===== PWHT =====
        const jt = firstData.jointType || (companyInfo && companyInfo.jointType) || 'C';
        const isD = jt === 'D';

        if (j0.pwht || j1.pwht || j2.pwht) {
            y = this._checkPage(doc, y, 260, startX, pageW, pageH);
            y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
                { t: 'PWHT', f: this.fonts.bold, c: this.colors.red, align: 'center' }
            ]);

            y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
                { t: 'Radiography Testing Requirement (After PWHT)', f: this.fonts.bold, c: this.colors.red, align: 'center' }
            ]);
            const s4_pwht = isD ? (allStagesData.stage8 || {}) : (allStagesData.stage4 || {});
            const s4_pwht_joints = s4_pwht.joints || (s4_pwht.jointNo ? [s4_pwht] : []);
            if (s4_pwht_joints.length) {
                y = this._sigBlockRed(doc, x, y, innerW, rowH, pad, s4_pwht, ws, 'NDT Engineer');
            }

            y = this._checkPage(doc, y, 260, startX, pageW, pageH);
            y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
                { t: 'Liquid Penetrant Testing – After PWHT', f: this.fonts.bold, c: this.colors.red, align: 'center' }
            ]);
            const s5_pwht = isD ? (allStagesData.stage9 || {}) : (allStagesData.stage5 || {});
            const s5_pwht_joints = s5_pwht.joints || (s5_pwht.jointNo ? [s5_pwht] : []);
            if (s5_pwht_joints.length) {
                y = this._sigBlockRed(doc, x, y, innerW, rowH, pad, s5_pwht, ws, 'NDT Engineer');
            }
        }
    }

    // ==========================================
    // Helpers
    // ==========================================
    _gridRow(doc, x, y, widths, minH, pad, cells) {
        let maxTextH = 0;
        cells.forEach((c, i) => {
            if (c && c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 8);
                const textH = doc.heightOfString(c.t, { width: widths[i] - pad * 2, align: c.align || 'left' });
                if (textH > maxTextH) maxTextH = textH;
            }
        });
        const h = Math.max(minH, maxTextH + 6);

        let cx = x;
        widths.forEach((w, i) => {
            doc.rect(cx, y, w, h).stroke();
            const c = cells[i] || {};
            if (c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 8).fillColor(c.c || this.colors.black)
                    .text(c.t, cx + pad, y + 3, { width: w - pad * 2, align: c.align || 'left' });
            }
            cx += w;
        });
        return y + h;
    }

    
    _sigBlockRed(doc, x, y, width, rowH, pad, stageObj, ws, qcTitle) {
        const joints = stageObj.joints || (stageObj.jointNo ? [stageObj] : []);
        const s0 = joints[0] || {};
        const s1 = joints[1] || {};
        const s2 = joints[2] || {};
        
        const labelW = ws[0] + ws[1] + ws[2];
        const newWs = [labelW, ws[3], ws[4], ws[5]];
        
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Remarks', f: this.fonts.bold, c: this.colors.red },
            { t: s0.remarks || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.remarks || '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.remarks || '', f: this.fonts.regular, c: this.colors.black }
        ]);

        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Production Engineer: Name', f: this.fonts.bold, c: this.colors.red },
            { t: s0.productionEngineerName || s0.prodName || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.productionEngineerName || s1.prodName || '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.productionEngineerName || s2.prodName || '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: s0.submissionDate || s0.prodDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.submissionDate || s1.prodDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.submissionDate || s2.prodDate || '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: qcTitle + ': Name', f: this.fonts.bold, c: this.colors.red },
            { t: s0.qcEngineerName || s0.qcName || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.qcEngineerName || s1.qcName || '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.qcEngineerName || s2.qcName || '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: s0.qcDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.qcDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.qcDate || '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Sign', f: this.fonts.bold, c: this.colors.red },
            { t: (s0.qcStatus === 'approved' || s0.status === 'approved') ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black },
            { t: (s1.qcStatus === 'approved' || s1.status === 'approved') ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black },
            { t: (s2.qcStatus === 'approved' || s2.status === 'approved') ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black }
        ]);
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'AI / CLIENT / TPIA: Name', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Sign', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        return y;
    }

        _compactSig(doc, x, y, width, rowH, pad, stageObj, ws) {
        const joints = stageObj.joints || (stageObj.jointNo ? [stageObj] : []);
        const s0 = joints[0] || {};
        const s1 = joints[1] || {};
        const s2 = joints[2] || {};

        const labelW = ws[0] + ws[1] + ws[2];
        const newWs = [labelW, ws[3], ws[4], ws[5]];

        const formatSig = (d, isQc) => {
            const name = isQc ? (d.qcEngineerName || '') : (d.productionEngineerName || '');
            const date = isQc ? (d.qcDate || '') : (d.submissionDate || '');
            const approved = isQc ? (d.qcStatus === 'approved') : false;
            return [name, date, approved ? 'Approve' : ''].filter(Boolean).join(' / ');
        };

        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Remarks', f: this.fonts.bold, c: this.colors.red },
            { t: s0.remarks || '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.remarks || '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.remarks || '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // Production Engineer
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Engineer Production  Dated Signature', f: this.fonts.bold, c: this.colors.red },
            { t: s0.jointNo ? formatSig(s0, false) : '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.jointNo ? formatSig(s1, false) : '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.jointNo ? formatSig(s2, false) : '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // QC Engineer
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'Engineer Shop QC Dated Signature', f: this.fonts.bold, c: this.colors.red },
            { t: s0.jointNo ? formatSig(s0, true) : '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.jointNo ? formatSig(s1, true) : '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.jointNo ? formatSig(s2, true) : '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // TPIA
        y = this._gridRow(doc, x, y, newWs, rowH, pad, [
            { t: 'CLIENT / AI /TPIA   Dated Signature', f: this.fonts.bold, c: this.colors.red },
            { t: s0.jointNo ? 'Yes/No' : '', f: this.fonts.regular, c: this.colors.black },
            { t: s1.jointNo ? 'Yes/No' : '', f: this.fonts.regular, c: this.colors.black },
            { t: s2.jointNo ? 'Yes/No' : '', f: this.fonts.regular, c: this.colors.black }
        ]);

        return y;
    }

    _checkPage(doc, y, needed, startX, pageW, pageH) {
        if (y + needed > startX + pageH - 10) {
            doc.addPage();
            doc.rect(startX, startX, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
            doc.lineWidth(0.5);
            return startX + 10;
        }
        return y;
    }

    _addFooters(doc) {
        const range = doc.bufferedPageRange();
        const oldBottom = doc.page.margins.bottom;
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.page.margins.bottom = 0; // Prevent auto page break
            
            // Border ends at doc.page.height - 25 = 817
            const borderBottom = doc.page.height - 25;
            
            // Exhibit No INSIDE the border, bottom left side
            const exhibitY = borderBottom - 10;
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                .text('EXHIBIT 10_3 GENERAL INSPECTION REPORT Rev.01', 30, exhibitY, { align: 'left', lineBreak: false });
                
            // Note OUTSIDE the border, centered in footer
            const noteY = borderBottom + 6;
            doc.font(this.fonts.bold).fontSize(8).fillColor('#555555')
                .text('*This is computer generated copy, hence no any signature required', 25, noteY, { width: doc.page.width - 50, align: 'center', lineBreak: false });
                
            doc.page.margins.bottom = oldBottom;
        }
    }
}

module.exports = new PDFGeneratorCD();
