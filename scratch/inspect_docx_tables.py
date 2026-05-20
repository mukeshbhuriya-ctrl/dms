import zipfile
import xml.etree.ElementTree as ET
import os

def inspect_docx_tables(docx_path, out_file):
    if not os.path.exists(docx_path):
        print(f"File not found: {docx_path}")
        return

    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    }

    with zipfile.ZipFile(docx_path) as docx:
        xml_content = docx.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        with open(out_file, 'w', encoding='utf-8') as out:
            out.write(f"=== DETAILED TABLES IN {os.path.basename(docx_path)} ===\n\n")
            body = root.find('w:body', namespaces)
            if body is None:
                out.write("No w:body\n")
                return
                
            tbl_count = 0
            for child in body:
                tag = child.tag.split('}')[-1]
                if tag == 'tbl':
                    tbl_count += 1
                    out.write(f"--- TABLE {tbl_count} ---\n")
                    rows = child.findall('.//w:tr', namespaces)
                    for r_idx, r in enumerate(rows):
                        cells = r.findall('.//w:tc', namespaces)
                        out.write(f"  Row {r_idx+1} ({len(cells)} cells):\n")
                        for c_idx, c in enumerate(cells):
                            # Extract cell properties (gridSpan, etc.)
                            tcPr = c.find('w:tcPr', namespaces)
                            grid_span = 1
                            v_merge = None
                            if tcPr is not None:
                                gs = tcPr.find('w:gridSpan', namespaces)
                                if gs is not None:
                                    grid_span = int(gs.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '1'))
                                vm = tcPr.find('w:vMerge', namespaces)
                                if vm is not None:
                                    v_merge = vm.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', 'continue')
                            
                            # Extract text
                            text_parts = []
                            for r_elem in c.findall('.//w:r', namespaces):
                                t = r_elem.find('w:t', namespaces)
                                if t is not None and t.text:
                                    text_parts.append(t.text)
                            text = "".join(text_parts).strip().replace('\n', ' ')
                            
                            span_str = f" [span={grid_span}]" if grid_span > 1 else ""
                            merge_str = f" [vMerge={v_merge}]" if v_merge else ""
                            out.write(f"    Col {c_idx+1}{span_str}{merge_str}: '{text}'\n")
                    out.write("\n")

if __name__ == '__main__':
    inspect_docx_tables('d:/DMS/2/scratch/2. Seam Welding Report.docx', 'd:/DMS/2/scratch/2_seam_detailed.txt')
    inspect_docx_tables('d:/DMS/2/scratch/3. Nozzle Report.docx', 'd:/DMS/2/scratch/3_nozzle_detailed.txt')
