import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path):
    try:
        doc = zipfile.ZipFile(file_path)
        xml_content = doc.read('word/document.xml')
        doc.close()
        
        tree = ET.fromstring(xml_content)
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        text = []
        for paragraph in tree.findall('.//w:p', ns):
            paragraph_text = []
            for run in paragraph.findall('.//w:r', ns):
                t = run.find('.//w:t', ns)
                if t is not None and t.text:
                    paragraph_text.append(t.text)
            text.append(''.join(paragraph_text))
                
        return '\n'.join(text)
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    file_path = sys.argv[1]
    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(read_docx(file_path))
