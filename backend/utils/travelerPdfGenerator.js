const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class TravelerPdfGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            white: '#FFFFFF',
            grey: '#BFBFBF'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    getColumns(width) {
        // We have exactly 35 columns.
        // Group 1 & 2: 5 cols = 20%
        // Fit Up (6) + Back Chip (2) + Weld Visual (6) = 14 cols * 2.6% = 36.4%
        // Final NDE (16) = 16 cols * 2.725% = 43.6%
        // Total = 100%
        const p = [
            0.045, 0.035, 0.07, 0.025, 0.025, // 5
            ...Array(14).fill(0.026),         // 14
            ...Array(16).fill(0.02725)        // 16
        ];
        return p.map(pct => width * pct);
    }

    drawHeader(doc, x, y, width) {
        const h1 = 30; // Welding & NDE main header
        const gap = 10; // Gap between title and grid
        const h2 = 160; // Increased complex sub-headers height to 160 to prevent text wrapping
        
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        
        // 1. Main Header
        doc.rect(x, y, width, h1).fillAndStroke(this.colors.grey, this.colors.black);
        doc.font(this.fonts.bold).fontSize(16).fillColor(this.colors.black)
           .text('Welding & NDE', x, y + 8, { width, align: 'center' });
           
        const cols = this.getColumns(width);

        const drawVText = (text, cx, cy, cw, ch) => {
            doc.save();
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black);
            const th = doc.heightOfString(text);
            doc.translate(cx + cw / 2, cy + ch / 2);
            doc.rotate(-90);
            doc.text(text, -ch/2, -th/2 + 1.5, { width: ch, align: 'center' });
            doc.restore();
        };

        const drawCell = (cx, cy, cw, ch, text, vText = false) => {
            doc.rect(cx, cy, cw, ch).fillAndStroke(this.colors.grey, this.colors.black);
            if (text) {
                if (vText) {
                    drawVText(text, cx, cy, cw, ch);
                } else {
                    doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black);
                    const th = doc.heightOfString(text, { width: cw - 2 });
                    doc.text(text, cx + 1, cy + (ch/2) - (th/2), { width: cw - 2, align: 'center' });
                }
            }
        };

        let startY = y + h1 + gap;
        let cIdx = 0;
        let curX = x;
        const nextX = (count) => {
            let w = 0;
            for(let i=0; i<count; i++) w += cols[cIdx + i];
            cIdx += count;
            const resX = curX;
            curX += w;
            return { cx: resX, cw: w };
        };

        // Group 1: Joint No (0), Process (1), WPS (2)
        let g1a = nextX(1); drawCell(g1a.cx, startY, g1a.cw, h2, "Joint\nNo.");
        let g1b = nextX(1); drawCell(g1b.cx, startY, g1b.cw, h2, "Process", true);
        let g1c = nextX(1); drawCell(g1c.cx, startY, g1c.cw, h2, "WPS No.");
        
        // Group 2: Assigned Welder ID (3, 4)
        let w_tack = cols[3];
        let w_final = cols[4];
        let g2 = nextX(2);
        drawCell(g2.cx, startY, g2.cw, 40, "Assigned\nWelder ID");
        drawCell(g2.cx, startY + 40, w_tack, 120, "Tack", true);
        drawCell(g2.cx + w_tack, startY + 40, w_final, 120, "Final", true);

        // Group 3: Fit Up Inspection (5 to 10)
        let g3 = nextX(6);
        drawCell(g3.cx, startY, g3.cw, 20, "Fit Up Inspection");
        
        drawCell(g3.cx, startY + 20, cols[5] + cols[6], 20, "Production");
        drawCell(g3.cx, startY + 40, cols[5], 120, "Sign", true);
        drawCell(g3.cx + cols[5], startY + 40, cols[6], 120, "Date", true);
        
        let cxF = g3.cx + cols[5] + cols[6];
        drawCell(cxF, startY + 20, cols[7] + cols[8], 20, "QC Engineer");
        drawCell(cxF, startY + 40, cols[7], 120, "Check Point", true);
        drawCell(cxF + cols[7], startY + 40, cols[8], 120, "Sign & Date", true);

        cxF += cols[7] + cols[8];
        drawCell(cxF, startY + 20, cols[9] + cols[10], 20, "AI");
        drawCell(cxF, startY + 40, cols[9], 120, "Check Point", true);
        drawCell(cxF + cols[9], startY + 40, cols[10], 120, "Sign & Date", true);

        // Group 4: Back Chip (11, 12)
        let g4 = nextX(2);
        drawCell(g4.cx, startY, g4.cw, 20, "Back Chip\nNDE (PT)");
        drawCell(g4.cx, startY + 20, g4.cw, 20, "QC Engineer");
        drawCell(g4.cx, startY + 40, cols[11], 120, "Check Point", true);
        drawCell(g4.cx + cols[11], startY + 40, cols[12], 120, "Sign & Date", true);

        // Group 5: Weld Visual Inspection (13 to 18)
        let g5 = nextX(6);
        drawCell(g5.cx, startY, g5.cw, 20, "Weld Visual Inspection");
        
        drawCell(g5.cx, startY + 20, cols[13] + cols[14], 20, "Production");
        drawCell(g5.cx, startY + 40, cols[13], 120, "Sign", true);
        drawCell(g5.cx + cols[13], startY + 40, cols[14], 120, "Date", true);
        
        let cxW = g5.cx + cols[13] + cols[14];
        drawCell(cxW, startY + 20, cols[15] + cols[16], 20, "QC Engineer");
        drawCell(cxW, startY + 40, cols[15], 120, "Check Point", true);
        drawCell(cxW + cols[15], startY + 40, cols[16], 120, "Sign & Date", true);

        cxW += cols[15] + cols[16];
        drawCell(cxW, startY + 20, cols[17] + cols[18], 20, "AI");
        drawCell(cxW, startY + 40, cols[17], 120, "Check Point", true);
        drawCell(cxW + cols[17], startY + 40, cols[18], 120, "Sign & Date", true);

        // Group 6: Final NDE (19 to 34)
        let g6 = nextX(16);
        drawCell(g6.cx, startY, g6.cw, 20, "Final NDE");
        let ndes = ['PT', 'RT', 'UT', 'MT'];
        let cxNDE = g6.cx;
        let pIdx = 19; 

        for (let i = 0; i < 4; i++) {
            let ndeW = cols[pIdx] + cols[pIdx+1] + cols[pIdx+2] + cols[pIdx+3];
            let qcW = cols[pIdx] + cols[pIdx+1];
            let aiW = cols[pIdx+2] + cols[pIdx+3];
            
            drawCell(cxNDE, startY + 20, ndeW, 20, ndes[i]);
            
            // QC Engineer / AI are 60 height, rotated, spanning 2 cols each
            drawCell(cxNDE, startY + 40, qcW, 60, "QC Engineer", true);
            drawCell(cxNDE + qcW, startY + 40, aiW, 60, "AI", true);
            
            // Bottom Check Point / Sign & Date are 60 height, rotated
            drawCell(cxNDE, startY + 100, cols[pIdx], 60, "Check Point", true);
            drawCell(cxNDE + cols[pIdx], startY + 100, cols[pIdx+1], 60, "Sign & Date", true);
            drawCell(cxNDE + qcW, startY + 100, cols[pIdx+2], 60, "Check Point", true);
            drawCell(cxNDE + qcW + cols[pIdx+2], startY + 100, cols[pIdx+3], 60, "Sign & Date", true);
            
            cxNDE += ndeW;
            pIdx += 4;
        }

        return { height: h1 + gap + h2, cols };
    }

    drawLegends(doc, x, y, width) {
        const row1H = 20;

        const l1 = [
            "Edge preparation, Root Gap, Root Face, Bevel Angle as shown in drawing",
            "Surface to be weld is free from Scale, Rust, Oil, Slag, Foreign Material Etc.",
            "Tack Welding for any defects",
            "Mis-Match (Tolerance as per UW-33)",
            "Orientation",
            "Identification Mark",
            "Previous stage NDE completion (If Entry in to vessel not possible after closing)"
        ];

        const l2 = [
            "As welded surface are sufficiently free from coarse ripples, Groove, Overlaps, abrupt ridges, valise, undercuts, weld spatters & Slags.",
            "Weld Reinforcement of Butt joints as per UW - 35",
            "Leg Length of fillet welds with required throat",
            "In complete penetration & Fusion in single welded joints."
        ];

        doc.font(this.fonts.regular).fontSize(9);
        let h1_content = 0;
        l1.forEach(str => { h1_content += doc.heightOfString("\u2022 " + str, { width: width/2 - 10 }) + 2; });
        let h2_content = 0;
        l2.forEach(str => { h2_content += doc.heightOfString("\u2022 " + str, { width: width/2 - 10 }) + 2; });
        
        const row2H = Math.max(90, h1_content + 10, h2_content + 10);

        const legHStr = "H - Inspection stage of Manufacturing beyond which no further operation shall be carried out until the Engr. QC & AI have signed off the traveler or other applicable documents signifying their acceptance. The AI shall be notified for HOLD Point Inspection in advance.";
        const legWStr = "W - Witness Point. A Stage beyond which no work can proceed until the AI has seen it or granted his / her written consent or permission to proceed further.";
        const legRStr = "R - Review an indication that documents result of test, examination OR Inspection requires review prior to completion of the job. Presence of the AI during the action being reported is not required.";

        const legHH = doc.heightOfString(legHStr, { width: width - 10 });
        const legWH = doc.heightOfString(legWStr, { width: width - 10 });
        const legRH = doc.heightOfString(legRStr, { width: width - 10 });
        
        const row3H = 15 + legHH + 5 + legWH + 5 + legRH + 10;

        // Draw Row 1
        doc.rect(x, y, width, row1H).stroke();
        doc.moveTo(x + width/2, y).lineTo(x + width/2, y + row1H).stroke();
        doc.fillColor(this.colors.black);
        doc.text("To Be Checked While Fit-Up Inspection", x, y + 6, { width: width/2, align: 'center' });
        doc.text("To Be Checked While Weld Visual Inspection", x + width/2, y + 6, { width: width/2, align: 'center' });

        // Draw Row 2
        doc.rect(x, y + row1H, width, row2H).stroke();
        doc.moveTo(x + width/2, y + row1H).lineTo(x + width/2, y + row1H + row2H).stroke();

        let ty1 = y + row1H + 5;
        l1.forEach(str => {
            const strF = "\u2022 " + str;
            doc.text(strF, x + 5, ty1, { width: width/2 - 10 });
            ty1 += doc.heightOfString(strF, { width: width/2 - 10 }) + 2;
        });

        let ty2 = y + row1H + 5;
        l2.forEach(str => {
            const strF = "\u2022 " + str;
            doc.text(strF, x + width/2 + 5, ty2, { width: width/2 - 10 });
            ty2 += doc.heightOfString(strF, { width: width/2 - 10 }) + 2;
        });

        // Draw Row 3
        doc.rect(x, y + row1H + row2H, width, row3H).stroke();
        doc.font(this.fonts.bold).text("LEGENDS:", x + 5, y + row1H + row2H + 5);
        
        doc.font(this.fonts.regular);
        let ly = y + row1H + row2H + 15;
        
        doc.text(legHStr, x + 5, ly, { width: width - 10 });
        ly += legHH + 5;
        
        doc.text(legWStr, x + 5, ly, { width: width - 10 });
        ly += legWH + 5;
        
        doc.text(legRStr, x + 5, ly, { width: width - 10 });

        return row1H + row2H + row3H;
    }

    generatePDF(data, res) {
        // We use A3 landscape to fit all the columns natively like the WebUI
        const doc = new PDFDocument({ 
            margin: 30, 
            size: 'A3', 
            layout: 'landscape',
            bufferPages: true 
        });
        
        doc.pipe(res);

        const startX = 30;
        let curY = 30;
        const pageWidth = doc.page.width - 60;
        
        const drawPageHeader = () => {
            curY = 30;
            const res = this.drawHeader(doc, startX, curY, pageWidth);
            curY += res.height;
            return res;
        };

        let pageData = drawPageHeader();
        let cols = pageData.cols;

        if (data.joints && data.joints.length > 0) {
            data.joints.forEach((joint) => {
                const rowData = joint.row_data || Array(35).fill({ value: "-", type: "stage" });

                // Calculate dynamic row height based on text length to prevent overlap
                doc.fontSize(8);
                let maxRowH = 20;

                rowData.forEach((cell) => {
                    const val = cell.value;
                    if (val && val !== "-") {
                        if (cell.type === "joint" || cell.type === "wps") {
                            // Horizontal text: jointNo and wps
                            const h = doc.heightOfString(val, { width: 40 }); // approximated width
                            if (h + 10 > maxRowH) maxRowH = h + 10;
                        } else {
                            // Vertical text: process, tack, final, and all dates/signs
                            const w = doc.widthOfString(val); // width of string becomes height when rotated -90
                            if (w + 10 > maxRowH) maxRowH = w + 10;
                        }
                    }
                });

                const dynamicRowH = maxRowH;

                if (curY + dynamicRowH > doc.page.height - 60) {
                    doc.addPage();
                    let pageData = drawPageHeader();
                    cols = pageData.cols;
                }

                doc.rect(startX, curY, pageWidth, dynamicRowH).stroke();
                
                let cx = startX;
                let colIdx = 0;
                
                const dCell = (val, color = this.colors.black, isBold = false, vText = false) => {
                    let cW = cols[colIdx];
                    doc.font(isBold ? this.fonts.bold : this.fonts.regular).fontSize(8).fillColor(color);
                    // Add vertical line
                    doc.moveTo(cx, curY).lineTo(cx, curY + dynamicRowH).stroke();
                    if (val && val !== "-") { // don't render "-" dashes in the small cells
                        if (vText) {
                            doc.save();
                            doc.translate(cx + cW / 2, curY + dynamicRowH / 2);
                            doc.rotate(-90);
                            const th = doc.heightOfString(val);
                            doc.text(val, -dynamicRowH/2, -th/2 + 1.5, { width: dynamicRowH, align: 'center' });
                            doc.restore();
                        } else {
                            const th = doc.heightOfString(val, { width: cW - 4 });
                            doc.text(val, cx + 2, curY + (dynamicRowH/2) - (th/2), { width: cW - 4, align: 'center', lineBreak: true });
                        }
                    }
                    cx += cW;
                    colIdx++;
                };

                rowData.forEach((cell) => {
                    const isBold = (cell.type === "joint");
                    const color = (cell.type === "joint") ? this.colors.red : this.colors.black;
                    const vText = (cell.type !== "joint" && cell.type !== "wps"); // jointNo and wps are horizontal, rest are vertical
                    
                    // If it's empty, we pass empty string so it skips rendering text but draws the cell
                    dCell(cell.value || "", color, isBold, vText);
                });

                curY += dynamicRowH;
            });
        }

        // Draw Legends
        if (curY + 200 > doc.page.height - 50) {
            doc.addPage();
            curY = 30;
        } else {
            curY += 20; // some gap
        }

        const legH = this.drawLegends(doc, startX, curY, pageWidth);
        curY += legH + 20;

        // Draw Remarks box
        if (curY + 100 > doc.page.height - 50) {
            doc.addPage();
            curY = 30;
        }
        
        doc.rect(startX, curY, pageWidth, 80).stroke();
        doc.font(this.fonts.regular).fontSize(10).fillColor(this.colors.black);
        doc.text("Remarks.:-", startX + 5, curY + 5);

        // Add Footers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            
            // Disable bottom margin to prevent infinite blank page loop
            const oldBottom = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            
            const footerY = doc.page.height - 30;
            doc.fontSize(8).font(this.fonts.bold).fillColor(this.colors.grey);
            doc.text('Exhibit No.: 8/02 Rev. 0 Date: 20.06.2024', startX, footerY, { lineBreak: false });
            doc.text(`Page ${i + 1} of ${range.count}`, startX, footerY, { align: 'right', width: pageWidth, lineBreak: false });
            
            // Restore margin
            doc.page.margins.bottom = oldBottom;
        }

        doc.end();
    }
}

module.exports = new TravelerPdfGenerator();
