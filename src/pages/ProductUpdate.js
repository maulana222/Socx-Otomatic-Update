import React, { useState, useRef } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';
import * as XLSX from 'xlsx';
import axios from 'axios';

const ProductUpdate = () => {
  const { bearerToken } = useBearerToken();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef(null);

  const requiredColumns = [
    'base_price',
    'code',
    'name',
    'suppliers_id',
    'trx_per_day'
  ];

  const optionalColumns = [
    'parameters',
    'regex_custom_info'
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file extension
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        alert('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setResults([]);
      setShowResults(false);
    }
  };

  const validateExcelData = (data) => {
    const errors = [];
    const validatedData = [];

    data.forEach((row, index) => {
      const rowErrors = [];
      const rowNumber = index + 2; // +2 because index starts at 0 and Excel has header row

      // Check required columns
      requiredColumns.forEach(column => {
        if (!row[column] && row[column] !== 0) {
          rowErrors.push(`Missing required column: ${column}`);
        }
      });

      // Validate data types
      if (row.base_price && isNaN(Number(row.base_price))) {
        rowErrors.push('base_price must be a number');
      }
      if (row.suppliers_id && isNaN(Number(row.suppliers_id))) {
        rowErrors.push('suppliers_id must be a number');
      }
      if (row.trx_per_day && isNaN(Number(row.trx_per_day))) {
        rowErrors.push('trx_per_day must be a number');
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          errors: rowErrors
        });
      } else {
        // Transform data to match API format
        const transformedRow = {
          base_price: Number(row.base_price),
          code: String(row.code),
          name: String(row.name),
          parameters: row.parameters || '',
          regex_custom_info: row.regex_custom_info || '',
          suppliers_id: Number(row.suppliers_id),
          trx_per_day: Number(row.trx_per_day)
        };
        validatedData.push(transformedRow);
      }
    });

    return { errors, validatedData };
  };

  const processExcelFile = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    if (!bearerToken) {
      alert('Please set Bearer Token first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResults([]);

    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      const { errors, validatedData } = validateExcelData(data);

      if (errors.length > 0) {
        setResults(errors);
        setShowResults(true);
        setIsUploading(false);
        return;
      }

      // Send data to API
      const apiResults = await sendDataToAPI(validatedData);
      setResults(apiResults);
      setShowResults(true);
    } catch (error) {
      console.error('Error processing file:', error);
      setResults([{ error: 'Error processing file: ' + error.message }]);
      setShowResults(true);
    } finally {
      setIsUploading(false);
    }
  };

  const sendDataToAPI = async (data) => {
    const results = [];
    const totalItems = data.length;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      try {
        const response = await axios.post(
          'https://indotechapi.socx.app/api/v1/suppliers_products',
          item,
          {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        results.push({
          row: i + 1,
          status: 'success',
          data: item,
          response: response.data
        });
      } catch (error) {
        results.push({
          row: i + 1,
          status: 'error',
          data: item,
          error: error.response?.data?.message || error.message
        });
      }

      // Update progress
      setUploadProgress(((i + 1) / totalItems) * 100);
    }

    return results;
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        base_price: 10000,
        code: 'OTF_FIW3_MOBO_10GB_14D_10K',
        name: 'Freedom Internet 10GB 14hr',
        parameters: '',
        regex_custom_info: '',
        suppliers_id: 35,
        trx_per_day: 100
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Add header row
    const headerRow = ['base_price', 'code', 'name', 'parameters', 'regex_custom_info', 'suppliers_id', 'trx_per_day'];
    XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: 'A1' });
    
    XLSX.writeFile(wb, 'product_update_template.xlsx');
  };

  const clearFile = () => {
    setFile(null);
    setResults([]);
    setShowResults(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Update Product Otomatis
        </h1>
        <p className="text-lg text-gray-600">
          Upload file Excel untuk update data produk secara otomatis ke SOCX API
        </p>
        <div className="mt-4">
          <a href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
            ← Kembali ke Dashboard
          </a>
        </div>
      </div>

      {/* Bearer Token Check */}
      {!bearerToken && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Bearer Token Required
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Please set your Bearer Token in the header to use this feature.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload File Excel</h2>
        
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          {/* File Info */}
          {file && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={processExcelFile}
              disabled={!file || !bearerToken || isUploading}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                !file || !bearerToken || isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {isUploading ? 'Processing...' : 'Process & Send to API'}
            </button>
            
            <button
              onClick={downloadTemplate}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
            >
              Download Template
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {Math.round(uploadProgress)}% Complete
          </p>
        </div>
      )}

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Results</h3>
          
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : result.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.status === 'success' ? 'Success' : result.status === 'error' ? 'Error' : 'Warning'}
                      </span>
                      {result.row && <span className="text-sm text-gray-600">Row {result.row}</span>}
                    </div>
                    
                    {result.status === 'success' ? (
                      <div>
                        <p className="text-sm text-green-800 mb-2">
                          Successfully sent: {result.data.name} ({result.data.code})
                        </p>
                        <details className="text-xs text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-800">View Details</summary>
                          <pre className="mt-2 bg-white p-2 rounded border text-xs overflow-x-auto">
                            {JSON.stringify(result.response, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : result.status === 'error' ? (
                      <div>
                        <p className="text-sm text-red-800 mb-2">
                          Error: {result.error}
                        </p>
                        <details className="text-xs text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-800">View Data</summary>
                          <pre className="mt-2 bg-white p-2 rounded border text-xs overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-yellow-800">
                          {result.errors?.join(', ') || result.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Excel Format Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Format Excel yang Diperlukan</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Kolom Wajib:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              {requiredColumns.map(column => (
                <li key={column} className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  <code className="bg-blue-100 px-1 rounded">{column}</code>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Kolom Opsional:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              {optionalColumns.map(column => (
                <li key={column} className="flex items-center">
                  <span className="w-2 h-2 bg-blue-300 rounded-full mr-2"></span>
                  <code className="bg-blue-100 px-1 rounded">{column}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white rounded border">
          <h5 className="font-medium text-blue-800 mb-2">Contoh Data:</h5>
          <pre className="text-xs text-blue-700 overflow-x-auto">
{`{
  "base_price": 10000,
  "code": "OTF_FIW3_MOBO_10GB_14D_10K",
  "name": "Freedom Internet 10GB 14hr",
  "parameters": "",
  "regex_custom_info": "",
  "suppliers_id": 35,
  "trx_per_day": 100
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ProductUpdate;
