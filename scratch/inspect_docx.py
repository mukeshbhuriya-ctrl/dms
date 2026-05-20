import zipfile
import xml.etree.ElementTree as ET
import os

def extract_docx_contents(docx_path, output_path):
    if not os.path.exists(docx_path):
        print(f"File not found: {docx_path}")
        return

    print(f"Parsing {docx_path}...")
    
    # Namespaces
    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    }

    try:
        with zipfile.ZipFile(docx_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            with open(output_path, 'w', encoding='utf-8') as out:
                out.write(f"=== CONTENTS OF {os.path.basename(docx_path)} ===\n\n")
                
                # We can iterate through the body elements recursively
                body = root.find('w:body', namespaces)
                if body is None:
                    out.write("No w:body found.\n")
                    return
                
                for elem in body:
                    tag = elem.tag.split('}')[-1]
                    if tag == 'p':
                        # Paragraph
                        text_parts = []
                        for r in elem.findall('.//w:r', namespaces):
                            t = r.find('w:t', namespaces)
                            if t is not None and t.text:
                                text_parts.append(t.text)
                        text = "".join(text_parts).strip()
                        if text:
                            out.write(f"[Paragraph] {text}\n")
                    elif tag == 'tbl':
                        # Table
                        out.write("\n[TABLE START]\n")
                        rows = elem.findall('.//w:tr', namespaces)
                        for r_idx, r in enumerate(rows):
                            cells = r.findall('.//w:tc', namespaces)
                            cell_texts = []
                            for c_idx, c in enumerate(cells):
                                # Get all text in cell
                                cell_parts = []
                                for r_elem in c.findall('.//w:r', namespaces):
                                    t = r_elem.find('w:t', namespaces)
                                    if t is not None and t.text:
                                        cell_parts.append(t.text)
                                cell_text = "".join(cell_parts).strip().replace('\n', ' ')
                                cell_texts.append(f"Cell {c_idx+1}: '{cell_text}'")
                            out.write(f"  Row {r_idx+1} -> " + " | ".join(cell_texts) + "\n")
                        out.write("[TABLE END]\n\n")
        print(f"Successfully wrote to {output_path}")
    except Exception as e:
        print(f"Error parsing {docx_path}: {e}")

if __name__ == '__main__':
    extract_docx_contents('d:/DMS/2/scratch/2. Seam Welding Report.docx', 'd:/DMS/2/scratch/2_seam_welding_report.txt')
    extract_docx_contents('d:/DMS/2/scratch/3. Nozzle Report.docx', 'd:/DMS/2/scratch/3_nozzle_report.txt')
