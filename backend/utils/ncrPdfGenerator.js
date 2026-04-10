const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class NCRPdfGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            darkBlue: '#000080',
            white: '#FFFFFF'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }


    drawHeader(doc, x, y, width, data, companyInfo) {
        const headerH = 70;
        doc.lineWidth(0.5).strokeColor(this.colors.black);

        // Logo Box (Left)
        const logoBoxW = 160;
        doc.rect(x, y, logoBoxW, headerH).stroke();
        const logoPath = companyInfo?.logoPath || path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 5, y + 10, { height: 30 });
            } catch (e) {
                const altLogo = path.join(process.cwd(), 'backend', 'public', 'logo.png');
                if (fs.existsSync(altLogo)) doc.image(altLogo, x + 5, y + 10, { height: 30 });
            }
        }
        doc.font(this.fonts.bold).fontSize(10).fillColor('#005596')
            .text(companyInfo?.name || 'Shreno Engineering Limited', x + 38, y + 15, { width: logoBoxW - 40, align: 'left' });

        // Title Box (Right)
        const titleBoxW = width - logoBoxW;
        const titleRowH = 40;
        const reportRowH = 30;

        doc.rect(x + logoBoxW, y, titleBoxW, titleRowH).stroke();
        doc.rect(x + logoBoxW, y + titleRowH, titleBoxW, reportRowH).stroke();

        // Title Text
        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.red)
            .text((companyInfo?.name || 'SHRENO ENGINEERING LIMITED').toUpperCase(), x + logoBoxW, y + 14, { width: titleBoxW, align: 'center' });

        // Subtitle Text
        doc.font(this.fonts.bold).fontSize(12).fillColor(this.colors.red)
            .text('NON CONFORMANCE REPORT', x + logoBoxW, y + titleRowH + 8, { width: titleBoxW, align: 'center' });

        return y + headerH;
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 20;
        const colW = width / 2;
        doc.fontSize(10);

        const rows = [
            { l1: 'NCR NO.:', v1: data.ncr_no, l2: 'DATE:', v2: data.date ? new Date(data.date).toLocaleDateString() : '' },
            { l1: 'CLIENT:', v1: data.client, l2: 'MSN. :', v2: data.msn },
            { l1: 'P.O. NO.:', v1: data.po_no, l2: 'TAG NO. :', v2: data.tag_no }
        ];

        let curY = y;
        rows.forEach(row => {
            // Col 1
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l1, x + 5, curY + 5);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(row.v1 || '-', x + 80, curY + 5);
            
            // Col 2
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l2, x + colW + 5, curY + 5);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(row.v2 || '-', x + colW + 80, curY + 5);
            
            curY += rowH;
        });

        // DRG NO. & REV NO.
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DRG. NO. & REV. NO.:', x + 5, curY + 5);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(`${data.drg_no || '-'} & ${data.rev_no || '-'}`, x + 130, curY + 5);
        
        curY += rowH + 5;
        doc.moveTo(x, curY).lineTo(x + width, curY).stroke();

        return curY;
    }

    drawSection(doc, x, y, width, label, content, height = 60, imagePath = null) {
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red).text(label, x + 5, y + 5);
        
        // If image provided, reduce text width to make room on the right
        const textWidth = imagePath ? (width * 0.65) : (width - 10);
        
        if (content) {
            doc.font(this.fonts.regular).fontSize(9).fillColor(this.colors.black).text(content, x + 5, y + 20, { width: textWidth });
        }

        if (imagePath && fs.existsSync(imagePath)) {
            try {
                // Dimensions for the image box
                const imgX = x + textWidth + 10;
                const imgY = y + 10;
                const imgW = width - textWidth - 15;
                const imgH = height - 20;

                doc.image(imagePath, imgX, imgY, {
                    fit: [imgW, imgH],
                    align: 'center',
                    valign: 'center'
                });
            } catch (e) {
                console.error('PDF Image Error:', e);
            }
        }

        const endY = y + height;
        doc.moveTo(x, endY).lineTo(x + width, endY).stroke();
        return endY;
    }

    drawCheckboxes(doc, x, y, options, selectedOptions) {
        let curX = x + 5;
        const boxSize = 10;
        doc.fontSize(9);

        options.forEach(opt => {
            // Draw box
            doc.rect(curX, y, boxSize, boxSize).strokeColor(this.colors.black).lineWidth(0.5).stroke();
            
            // If selected, draw X
            if (selectedOptions && selectedOptions.includes(opt)) {
                doc.moveTo(curX, y).lineTo(curX + boxSize, y + boxSize).stroke();
                doc.moveTo(curX + boxSize, y).lineTo(curX, y + boxSize).stroke();
            }

            // Label
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(opt, curX + boxSize + 5, y + 1);
            curX += 80; // Space between options
        });
    }

    generateNCR(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: 25, size: 'A4' });
        doc.pipe(res);

        const startX = 40;
        const startY = 40;
        const width = doc.page.width - 80;
        const height = doc.page.height - 80;

        // Main Border
        doc.rect(startX, startY, width, height).strokeColor(this.colors.black).lineWidth(1).stroke();

        let curY = startY;
        curY = this.drawHeader(doc, startX, curY, width, data, companyInfo);
        curY = this.drawInfoGrid(doc, startX, curY, width, data);

        // Identify if there is an image attachment for Stage 1
        const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
        const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
        let stage1ImagePath = null;

        if (data.attachments && Array.isArray(data.attachments)) {
            const firstImg = data.attachments.find(att => 
                att.filename && (att.type?.startsWith('image/') || att.name?.match(/\.(jpg|jpeg|png)$/i))
            );
            if (firstImg) {
                stage1ImagePath = path.join(UPLOAD_DIR, firstImg.filename);
            }
        }

        // Description of Non-Conformance
        curY = this.drawSection(doc, startX, curY, width, 'DESCRIPTION OF NON-CONFORMANCE:', data.description_non_conformance, 100, stage1ImagePath);

        // Raised At / By
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red).text('NCR RAISED AT:', startX + 5, curY + 6);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.raised_at_user?.name || data.ncr_raised_at || '-', startX + 90, curY + 6);
        
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('NCR Raised BY:', startX + 300, curY + 6);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.initiator?.name || '-', startX + 380, curY + 6);
        
        curY += 24;
        doc.moveTo(startX, curY).lineTo(startX + width, curY).stroke();

        // Attachments (Stage 1)
        if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
            doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('ATTACHMENTS (Stage 1):', startX + 5, curY + 6);
            let attList = data.attachments.map(att => att.name).join(', ');
            doc.font(this.fonts.regular).fontSize(8).fillColor(this.colors.black).text(attList, startX + 115, curY + 6, { width: width - 120 });
            curY += 24;
            doc.moveTo(startX, curY).lineTo(startX + width, curY).stroke();
        }

        // Proposed Resolution
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('PROPOSED RESOLUTION WITH JUSTIFICATION:', startX + 5, curY + 6);
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DATE:', startX + 400, curY + 6);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.resolution_date ? new Date(data.resolution_date).toLocaleDateString() : '-', startX + 440, curY + 6);
        
        if (data.proposed_resolution) {
            doc.font(this.fonts.regular).fontSize(9).fillColor(this.colors.black).text(data.proposed_resolution, startX + 5, curY + 22, { width: width - 10 });
        }
        
        curY += 90; // Increased height for better spacing
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('BY : Shreno engineering Limited', startX + width - 185, curY - 15);
        doc.moveTo(startX, curY).lineTo(startX + width, curY).stroke();

        // Acceptance of Proposal
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('ACCEPTANCE OF PROPOSAL FOR RESOLUTION:', startX + 5, curY + 6);
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DATE:', startX + 400, curY + 6);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.acceptance_date ? new Date(data.acceptance_date).toLocaleDateString() : '-', startX + 440, curY + 6);
        
        curY += 35; 
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('Customer approval required.', startX + 5, curY);
        
        curY += 30; 
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red).text('RESOLUTION APPROVAL', startX + 5, curY);
        curY += 15;
        this.drawCheckboxes(doc, startX, curY, ['USE AS IS', 'REPAIR', 'REWORK', 'REJECTED'], data.resolution_approval);

        curY += 35; 
        doc.fontSize(9);
        const sigW = width / 4;
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('Head Design:', startX + 5, curY);
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('Head Welding:', startX + sigW + 5, curY);
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('Head Quality:', startX + 2 * sigW + 5, curY);
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('AI:', startX + 3 * sigW + 5, curY);
        
        doc.font(this.fonts.regular).fillColor(this.colors.black).fontSize(8);
        doc.text(data.target_head_design?.name || '', startX + 5, curY + 12);
        doc.text(data.target_head_welding?.name || '', startX + sigW + 5, curY + 12);
        doc.text(data.target_head_quality?.name || '', startX + 2 * sigW + 5, curY + 12);

        curY += 35;
        doc.moveTo(startX, curY).lineTo(startX + width, curY).stroke();

        // Corrective Action
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red).text('CORRECTIVE ACTION VERIFICATION CARRIED OUT BY:', startX + 5, curY + 6);
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DATE:', startX + 400, curY + 6);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.corrective_action_date ? new Date(data.corrective_action_date).toLocaleDateString() : '-', startX + 440, curY + 6);
        
        if (data.corrective_action_comments) {
            doc.font(this.fonts.regular).fontSize(9).fillColor(this.colors.black).text(data.corrective_action_comments, startX + 5, curY + 22, { width: width - 10 });
        }

        curY += 90; // Increased height
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('VERIFIED BY QCE:', startX + 5, curY);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.qce_verifier?.name || '', startX + 90, curY);
        
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('VERIFIED BY AI', startX + 300, curY);
        
        curY += 24;
        doc.moveTo(startX, curY).lineTo(startX + width, curY).stroke();

        // Disposition
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red).text('DISPOSITION:', startX + 5, curY + 6);
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DATE:', startX + 400, curY + 6);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.disposition_date ? new Date(data.disposition_date).toLocaleDateString() : '-', startX + 440, curY + 6);
        
        if (data.disposition) {
            doc.font(this.fonts.regular).fontSize(9).fillColor(this.colors.black).text(data.disposition, startX + 5, curY + 22, { width: width - 10 });
        }

        curY += 100; // Increased to fill remaining space
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('VERIFIED BY Head Quality:', startX + 5, curY);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(data.head_quality_verifier?.name || '', startX + 130, curY);

        // Simple Footer
        const footerY = startY + height + 5;
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
        doc.text('EXHIBIT 10/4', startX, footerY);
        doc.text('REV.: R2', startX + width - 100, footerY, { align: 'right' });
        doc.text('PAGE 01 OF 01', startX + width - 100, footerY + 8, { align: 'right' });

        doc.end();
    }
}

module.exports = new NCRPdfGenerator();
