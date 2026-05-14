import { useRef, useState } from "react";

const ACCEPT = [
  ".pdf", ".doc", ".docx",
  ".ppt", ".pptx",
  ".xls", ".xlsx",
  ".png", ".jpg", ".jpeg",
  ".dwg",
].join(",");

export default function FileDropzone({
  onFiles = () => {},
  note = "Arrastra aquí tus archivos o haz clic para seleccionar",
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    setFiles((prev) => [...prev, ...arr]);
    onFiles(arr);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onChange = (e) => handleFiles(e.target.files);

  const removeAt = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div
        className={[
          "rounded-2xl border transition-all",
          "bg-white/70 backdrop-blur-sm",
          isDragging ? "border-[--color-accent] ring-2 ring-[--color-accent]/40" : "border-slate-200",
          "p-6 md:p-8 cursor-pointer select-none",
        ].join(" ")}
        onClick={openPicker}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        aria-label="Dropzone para subir archivos"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={onChange}
        />

        <div className="grid place-items-center text-center">
          <div className="text-slate-500">
            <div className="text-sm md:text-base">
              {note}
            </div>
            <div className="mt-2 text-xs">
              PDF, DOC(X), PPT(X), XLS(X), PNG, JPG, DWG
            </div>
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[--color-accent] text-white px-4 py-2 text-sm">
              Seleccionar archivos
            </span>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="p-4 text-[--color-ink] font-medium">
            Archivos en la selección ({files.length})
          </div>
          <ul className="max-h-52 overflow-auto divide-y divide-slate-200">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between px-4 py-2 text-sm">
                <div className="truncate">
                  <span className="font-medium">{f.name}</span>{" "}
                  <span className="text-slate-500">({Math.round(f.size / 1024)} KB)</span>
                </div>
                <button
                  className="text-[--color-accent] hover:underline"
                  onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
