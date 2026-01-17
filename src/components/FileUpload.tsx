import React, { useState } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  acceptedFormats?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  maxFiles = 5,
  acceptedFormats = '.pdf,.doc,.docx,.txt',
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).slice(0, maxFiles - files.length);
    const newFiles = [...files, ...droppedFiles];
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, maxFiles - files.length);
      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);
      onFilesSelected(newFiles);
    }
  };

  const removeFile = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className="file-upload">
      <div
        className={`upload-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <FiUpload size={32} />
        <p className="upload-text">Drag files here or click to browse</p>
        <p className="upload-hint">Accepted formats: {acceptedFormats}</p>
        <input
          type="file"
          multiple
          accept={acceptedFormats}
          onChange={handleFileInput}
          disabled={files.length >= maxFiles}
          style={{ display: 'none' }}
          id="file-input"
        />
        <label htmlFor="file-input" className="file-input-label">
          Browse Files
        </label>
      </div>

      {files.length > 0 && (
        <div className="files-list">
          <h4>Selected Files ({files.length}/{maxFiles})</h4>
          <ul>
            {files.map((file, idx) => (
              <li key={idx} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
                <button
                  onClick={() => removeFile(idx)}
                  className="remove-btn"
                  title="Remove file"
                >
                  <FiX size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
