import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onFileLoad: (data: any[], sheetNames: string[], columnRefs: Record<string, string>) => void;
}

const getExcelColumnName = (index: number): string => {
  let columnName = '';
  while (index >= 0) {
    columnName = String.fromCharCode((index % 26) + 65) + columnName;
    index = Math.floor(index / 26) - 1;
  }
  return columnName;
};

export function FileUpload({ onFileLoad }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      const firstSheet = workbook.Sheets[sheetNames[0]];

      // Get the range of the sheet
      const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
      
      // Get headers from the first row
      const headers: string[] = [];
      const columnRefs: Record<string, string> = {};
      
      // Create a map to store all column references, even empty ones
      const allColumnRefs: Record<string, string> = {};
      
      // First, add all columns regardless of content
      for (let C = range.s.c; C <= range.e.c; C++) {
        const colRef = getExcelColumnName(C);
        const cellRef = `${colRef}1`;
        const cell = firstSheet[XLSX.utils.encode_cell({ r: 0, c: C })];
        
        // If the cell has a value, use it as the header
        if (cell && cell.v) {
          const header = cell.v.toString().trim();
          headers.push(header);
          columnRefs[header] = cellRef;
        } else {
          // For empty cells, create a placeholder header
          const emptyHeader = `Column ${colRef}`;
          headers.push(emptyHeader);
          columnRefs[emptyHeader] = cellRef;
        }
        
        // Store the column reference for all columns
        allColumnRefs[`Column ${colRef}`] = cellRef;
      }

      // Convert sheet data to JSON with all headers
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
        header: headers,
        defval: '' // Use empty string as default value for missing cells
      });

      // Remove the header row from the data
      const dataWithoutHeader = jsonData.slice(1);

      onFileLoad(dataWithoutHeader, sheetNames, columnRefs);
    };

    reader.readAsArrayBuffer(file);
  }, [onFileLoad]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
    >
      <input {...getInputProps()} />
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="text-lg font-medium text-gray-600">
        {isDragActive ? 'Drop the Excel file here' : 'Drag & drop an Excel file here, or click to select'}
      </p>
      <p className="mt-2 text-sm text-gray-500">Supports .xlsx and .xls files</p>
    </div>
  );
}