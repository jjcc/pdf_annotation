import React, { useState } from 'react';

interface ToolbarProps {
  isDrawing: boolean;
  onDrawingToggle: (isDrawing: boolean) => void;
  currentPage: number;
  numPages: number | null;
  onPageChange: (page: number) => void;
}

export default function Toolbar({ isDrawing, onDrawingToggle, currentPage, numPages, onPageChange }: ToolbarProps) {
  const [pageInput, setPageInput] = useState('');

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (!isNaN(pageNum) && numPages && pageNum >= 1 && pageNum <= numPages) {
      onPageChange(pageNum);
    }
    setPageInput('');
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          
          <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-2">
            <input
              type="number"
              value={pageInput}
              onChange={handlePageInputChange}
              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              placeholder="Page"
            />
            {numPages && <span className="text-gray-500">of {numPages}</span>}
            <button
              type="submit"
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={!numPages || !pageInput}
            >
              Go
            </button>
          </form>
          
          <button
            onClick={handleNextPage}
            disabled={!numPages || currentPage >= numPages}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onDrawingToggle(!isDrawing)}
            className={`px-3 py-1 ${isDrawing ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-md hover:${isDrawing ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            {isDrawing ? 'Exit Draw Mode' : 'Draw Rectangle'}
          </button>
          
          <button
            onClick={() => {
              // Clear all annotations for current page - would need to be implemented in parent
              alert('Clear annotations feature would be implemented here');
            }}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}