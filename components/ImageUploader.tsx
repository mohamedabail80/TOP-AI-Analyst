import React, { useRef } from 'react';
import { UploadedFile } from '../types';

interface ImageUploaderProps {
  label: 'PropellerAds (Cost)' | 'Kadam (Revenue)';
  fileData: UploadedFile | null;
  onFileSelect: (file: UploadedFile) => void;
  color: 'red' | 'green';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, fileData, onFileSelect, color }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await processAndConvertToBase64(file);
        onFileSelect({
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mimeType: 'image/jpeg', // We convert to JPEG during processing
          label
        });
      } catch (err) {
        console.error("Error processing image:", err);
        alert("Failed to process image. Please try another file.");
      }
    }
  };

  const processAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1536; // Max dimension to keep payload reasonable

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with 0.8 quality to reduce size significantly
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          // Remove data prefix
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const borderColor = color === 'red' ? 'border-red-500/30 hover:border-red-500/60' : 'border-emerald-500/30 hover:border-emerald-500/60';
  const bgColor = color === 'red' ? 'bg-red-500/5' : 'bg-emerald-500/5';
  const iconColor = color === 'red' ? 'text-red-400' : 'text-emerald-400';

  return (
    <div 
      className={`relative w-full aspect-video rounded-xl border-2 border-dashed ${borderColor} ${bgColor} transition-all cursor-pointer group flex flex-col items-center justify-center overflow-hidden`}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={inputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />
      
      {fileData ? (
        <>
          <img src={fileData.previewUrl} alt={label} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
          <div className="z-10 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700 shadow-xl">
            <span className="text-white font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {fileData.file.name}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center p-6">
          <div className={`w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 ${iconColor}`}>
             {color === 'red' ? (
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             ) : (
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             )}
          </div>
          <h3 className="text-lg font-bold text-slate-200">{label}</h3>
          <p className="text-sm text-slate-400 mt-2">Click to upload screenshot</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;