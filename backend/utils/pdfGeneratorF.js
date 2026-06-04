const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Generator for Joint Type F – Simplified Nozzle Report
 * Same visual style as C/D: RED labels, outer border, header, bullet points
 */
class PDFGeneratorF {
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
        this._drawReport(doc, allStagesData, companyInfo);
        this._addFooters(doc);
        doc.end();
    }

    _drawReport(doc, allStagesData, companyInfo) {
        const startX = 25, startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;
        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
        doc.lineWidth(0.5);

        let y = startY + 5;
        const innerW = pageW - 10;
        const x = startX + 5;
        const pad = 4;
        const rowH = 16;

        const stage1Obj = allStagesData.stage1 || Object.values(allStagesData)[0] || {};
        const s1_joints = stage1Obj.joints || (stage1Obj.jointNo ? [stage1Obj] : []);
        const j0 = s1_joints[0] || {};
        const j1 = s1_joints[1] || {};
        const j2 = s1_joints[2] || {};
        const firstData = j0;

        // Header
        const headerH = 70, logoW = 160;
        doc.rect(x, y, logoW, headerH).stroke();
        this.drawLogo(doc, x, y, logoW, headerH, companyInfo);
        const titleBoxW = innerW - logoW;
        doc.rect(x + logoW, y, titleBoxW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(13).fillColor(this.colors.red)
            .text('GENERAL INSPECTION REPORT', x + logoW, y + 10, { width: titleBoxW, align: 'center' });
        doc.fontSize(10)
            .text('(CHECK SHEET FOR', x + logoW, y + 28, { width: titleBoxW, align: 'center' });
        doc.text('NOZZLE SET-UP & WELDING INSPECTION)', x + logoW, y + 40, { width: titleBoxW, align: 'center' });
        y += headerH + 5;

        // Metadata
        const metaRowH = 20;
        [
            ['Shreno Manufacturer sr. no.:', firstData.msn || '-'],
            ['Equipment  Name & Tag Number:', `${firstData.equipment || ''} ${firstData.tagNo || ''}`.trim() || '-'],
            ['Drawing no. :', firstData.drgNo || '-']
        ].forEach(([l, v]) => {
            doc.rect(x, y, innerW, metaRowH).stroke();
            doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text(l, x + pad, y + 5, { width: innerW * 0.4 });
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(v, x + innerW * 0.4 + pad, y + 5, { width: innerW * 0.6 });
            y += metaRowH;
        });

        // Table Layout
        const srW = innerW * 0.07;
        const charW = innerW * 0.20;
        const detW = innerW * 0.25;
        const extW = innerW - srW - charW - detW;
        const j0W = extW * 0.333;
        const j1W = extW * 0.333;
        const j2W = extW - j0W - j1W;
        const ws = [srW, charW, detW, j0W, j1W, j2W];

        // Header row
        y = this._gridRow(doc, x, y, [srW, charW, detW + extW], rowH + 2, pad, [
            { t: 'Sr. No.', f: this.fonts.bold, c: this.colors.black },
            { t: 'Characteristics to be checked', f: this.fonts.bold, c: this.colors.black },
            { t: '' }
        ]);

        // Joint Number
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' },
            { t: 'Joint Number', f: this.fonts.bold, c: this.colors.red },
            { t: '' },
            { t: j0.jointNo || '-', f: this.fonts.bold, c: this.colors.black },
            { t: j1.jointNo || '', f: this.fonts.bold, c: this.colors.black },
            { t: j2.jointNo || '', f: this.fonts.bold, c: this.colors.black }
        ]);

        // Char 1: Material ID
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '1', f: this.fonts.bold, c: this.colors.black },
            { t: 'Material identification Marks', f: this.fonts.bold, c: this.colors.red },
            { t: 'Available / Not Available', f: this.fonts.regular, c: this.colors.black },
            { t: j0.jointNo ? (j0.materialIdMarks || 'Available') : '' },
            { t: j1.jointNo ? (j1.materialIdMarks || 'Available') : '' },
            { t: j2.jointNo ? (j2.materialIdMarks || 'Available') : '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' }, { t: '• Tack Welder', f: this.fonts.bold, c: this.colors.red },
            { t: j0.tackWelder || '' },
            { t: j1.tackWelder || '' },
            { t: j2.tackWelder || '' }
        ]);
        y = this._compactSig(doc, x, y, innerW, rowH, pad, stage1Obj, ws);

        // Char 2: Weld Visual
        const s2_f = allStagesData.stage2 || {};
        const s2_joints = s2_f.joints || (s2_f.jointNo ? [s2_f] : []);
        const s2_0 = s2_joints[0] || {};
        const s2_1 = s2_joints[1] || {};
        const s2_2 = s2_joints[2] || {};
        
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '2', f: this.fonts.bold, c: this.colors.black },
            { t: 'Weld Visual', f: this.fonts.bold, c: this.colors.red },
            { t: '• Welder Number', f: this.fonts.bold, c: this.colors.red },
            { t: s2_0.welderNumber || s2_0.welderNo || '' },
            { t: s2_1.welderNumber || s2_1.welderNo || '' },
            { t: s2_2.welderNumber || s2_2.welderNo || '' }
        ]);
        y = this._gridRow(doc, x, y, ws, rowH, pad, [
            { t: '' }, { t: '' }, { t: '• Welding Process', f: this.fonts.bold, c: this.colors.red },
            { t: s2_0.weldingProcess || '' },
            { t: s2_1.weldingProcess || '' },
            { t: s2_2.weldingProcess || '' }
        ]);
        if (s2_joints.length) y = this._compactSig(doc, x, y, innerW, rowH, pad, s2_f, ws);

        
        // ===== PWHT =====
        if (j0.pwht || j1.pwht || j2.pwht) {
            y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
                { t: 'PWHT', f: this.fonts.bold, c: this.colors.red, align: 'center' }
            ]);

            y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
                { t: 'Radiography Testing Requirement (After PWHT)', f: this.fonts.bold, c: this.colors.red, align: 'center' }
            ]);
            const s3_pwht = allStagesData.stage3 || {};
            const s3_pwht_joints = s3_pwht.joints || (s3_pwht.jointNo ? [s3_pwht] : []);
            if (s3_pwht_joints.length) {
                y = this._sigBlockRed(doc, x, y, innerW, rowH, pad, s3_pwht, ws, 'NDT Engineer');
            }

            y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
                { t: 'Liquid Penetrant Testing – After PWHT', f: this.fonts.bold, c: this.colors.red, align: 'center' }
            ]);
            const s4_pwht = allStagesData.stage4 || {};
            const s4_pwht_joints = s4_pwht.joints || (s4_pwht.jointNo ? [s4_pwht] : []);
            if (s4_pwht_joints.length) {
                y = this._sigBlockRed(doc, x, y, innerW, rowH, pad, s4_pwht, ws, 'NDT Engineer');
            }
        }
    }

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

module.exports = new PDFGeneratorF();
