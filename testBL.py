from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from docx import Document
from docx2pdf import convert
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Add this line to enable CORS for all routes

def replace_text_in_table(table, replacements):
    for row in table.rows:
        for cell in row.cells:
            for key, value in replacements.items():
                if key in cell.text:
                    cell.text = cell.text.replace(key, value)

def replace_text_in_docx(arr, docx_path, output_path):
    doc = Document(docx_path)
    replacements = {
        'Test1': arr[0],
        'Test2': arr[1],
        'Test3': arr[2],
        'Test4': arr[3],
        'Test5': arr[4],
        'Test6': arr[5],
        'date': datetime.now().strftime('%d/%m/%Y')
    }
    for paragraph in doc.paragraphs:
        for key, value in replacements.items():
            if key in paragraph.text:
                paragraph.text = paragraph.text.replace(key, value)
    for table in doc.tables:
        replace_text_in_table(table, replacements)
    temp_docx_path = output_path.replace('.pdf', '_temp.docx')
    doc.save(temp_docx_path)
    convert(temp_docx_path, output_path)
    os.remove(temp_docx_path)

@app.route('/generate_pdf', methods=['POST'])
def generate_pdf():
    data = request.json
    arr = data['arr']
    directory = 'C:\\BituahLeumiForms'

    if not os.path.exists(directory):
        os.makedirs(directory)

    output_path = os.path.join(directory, f'{arr[2]}.pdf')
    replace_text_in_docx(arr, 'volDoc.docx', output_path)
    
    return send_file(output_path, as_attachment=True, download_name=f'{arr[2]}.pdf')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
