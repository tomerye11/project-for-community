import sys
from docx import Document
from docx2pdf import convert

def fill_volunteer_form(data):
    doc = Document(data['template_path'])

    replacements = {
        'שם פרטי:': data['first_name'],
        'שם משפחה:': data['last_name'],
        'מספר זהות:': data['id_number'],
        'טלפון:': data['phone'],
        'טלפון נייד:': data['mobile_phone'],
    }

    for paragraph in doc.paragraphs:
        for key, value in replacements.items():
            if key in paragraph.text:
                paragraph.text = paragraph.text.replace(key, key + ' ' + value)

    doc_path = data['doc_path']
    pdf_path = data['pdf_path']
    doc.save(doc_path)

    convert(doc_path, pdf_path)
    return pdf_path

if __name__ == "__main__":
    data = {
        'template_path': sys.argv[1],
        'first_name': sys.argv[2],
        'last_name': sys.argv[3],
        'id_number': sys.argv[4],
        'phone': sys.argv[5],
        'mobile_phone': sys.argv[6],
        'doc_path': sys.argv[7],
        'pdf_path': sys.argv[8],
    }
    fill_volunteer_form(data)
