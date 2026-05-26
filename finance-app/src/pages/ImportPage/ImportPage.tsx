import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import * as api from '../../api/api';
import type { ImportResponse } from '../../api/api';
import './ImportPage.css';

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const res = await api.importFile(file);
      setResult(res);
      setStep(3);
    } catch (e) {
      console.error(e);
      setResult({ imported: 0, skipped: 0, errors: ['Ошибка при импорте файла'] });
      setStep(3);
    } finally {
      setImporting(false);
    }
  }

  function handleNext() {
    if (step === 1 && file) {
      setStep(2);
    } else if (step === 2) {
      handleImport();
    } else if (step === 3) {
      // Reset
      setStep(1);
      setFile(null);
      setResult(null);
    }
  }

  return (
    <div className="import-page">
      <div className="page-header">
        <h1 className="page-title">Импорт данных</h1>
        <p className="page-subtitle">Загрузите CSV или Excel файл</p>
      </div>

      <div className="import-card">
        <div className="import-steps">
          <div className={`import-step ${step >= 1 ? 'active' : ''}`}>1. Загрузка</div>
          <div className={`import-step ${step >= 2 ? 'active' : ''}`}>2. Подтверждение</div>
          <div className={`import-step ${step >= 3 ? 'active' : ''}`}>3. Готово</div>
        </div>

        {step === 1 && (
          <div
            className={`import-dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload size={40} className="import-dropzone-icon" />
            <p className="import-dropzone-text">Перетащите файл</p>
            <p className="import-dropzone-hint">или</p>
            <label className="btn btn-primary import-file-btn">
              Выбрать файл
              <input type="file" accept=".csv,.xlsx,.json" hidden onChange={handleFileInput} />
            </label>
            {file && (
              <div className="import-file-info">
                <span>{file.name}</span>
                <button onClick={() => setFile(null)}><X size={14} /></button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="import-mapping">
            <p className="import-mapping-text">
              Файл <strong>{file?.name}</strong> будет импортирован.
            </p>
            <p className="import-mapping-text">
              Ожидаемые столбцы: <strong>Дата</strong>, <strong>Категория</strong>, <strong>Описание</strong>, <strong>Сумма</strong>, <strong>Тип</strong>
            </p>
            <p className="import-mapping-text" style={{ opacity: 0.7, fontSize: '0.85rem' }}>
              Разделитель: точка с запятой (;) или запятая (,). Кодировка: UTF-8 или Windows-1251.
            </p>
            {importing && <p className="import-mapping-text" style={{ color: 'var(--accent)' }}>Импортируем...</p>}
          </div>
        )}

        {step === 3 && result && (
          <div className="import-done">
            {result.imported > 0 ? (
              <>
                <div className="import-done-icon"><CheckCircle size={48} color="var(--success)" /></div>
                <h2>Импорт завершён!</h2>
                <p>Импортировано: <strong>{result.imported}</strong></p>
                {result.skipped > 0 && <p>Пропущено: <strong>{result.skipped}</strong></p>}
              </>
            ) : (
              <>
                <div className="import-done-icon"><AlertCircle size={48} color="var(--danger)" /></div>
                <h2>Ошибка импорта</h2>
              </>
            )}
            {result.errors.length > 0 && (
              <div style={{ textAlign: 'left', marginTop: '1rem', fontSize: '0.85rem', opacity: 0.7 }}>
                {result.errors.map((err, i) => <p key={i}>⚠ {err}</p>)}
              </div>
            )}
          </div>
        )}

        <div className="import-actions">
          <button className="btn btn-ghost" onClick={() => { if (step === 1) { setFile(null); } else { setStep(Math.max(1, step - 1)); } }}>
            {step === 1 ? 'Отмена' : 'Назад'}
          </button>
          <button className="btn btn-primary" onClick={handleNext} disabled={(step === 1 && !file) || importing}>
            {step === 3 ? 'Готово' : step === 2 ? (importing ? 'Импорт...' : 'Импортировать') : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
}
