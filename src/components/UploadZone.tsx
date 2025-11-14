import { motion, AnimatePresence } from "motion/react";
import { Upload, File, X, CheckCircle } from "lucide-react";
import { useState } from "react";
import { GlassButton } from "./GlassButton";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "complete";
  progress: number;
}

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  const handleFileUpload = (fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
      status: "uploading",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  progress,
                  status: progress >= 100 ? "complete" : "uploading",
                }
              : f
          )
        );
        if (progress >= 100) clearInterval(interval);
      }, 200);
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <motion.div
        className={`glass-panel rounded-3xl p-12 border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? "border-purple-500 bg-purple-500/10"
            : "border-white/20 hover:border-white/40"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
      >
        <div className="text-center">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-6"
            animate={{
              scale: isDragging ? 1.1 : 1,
              rotate: isDragging ? 360 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            <Upload className="w-10 h-10 text-white" />
          </motion.div>

          <h3 className="text-2xl text-white mb-2">
            Drop your files here
          </h3>
          <p className="text-white/60 mb-6">
            or click to browse from your device
          </p>

          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <GlassButton variant="secondary" onClick={() => document.getElementById("file-upload")?.click()}>
              Browse Files
            </GlassButton>
          </label>
        </div>
      </motion.div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {files.map((file, index) => (
              <motion.div
                key={file.id}
                className="glass-panel rounded-2xl p-4 relative overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-4">
                  {/* File Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    {file.status === "complete" ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <File className="w-6 h-6 text-white" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white truncate">{file.name}</p>
                      <span className="text-sm text-white/60 ml-2">{file.size}</span>
                    </div>

                    {/* Progress Bar */}
                    {file.status === "uploading" && (
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <motion.button
                    onClick={() => removeFile(file.id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
