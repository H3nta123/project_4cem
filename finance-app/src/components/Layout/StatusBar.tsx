import { Save, Activity } from 'lucide-react';
import './StatusBar.css';

export default function StatusBar() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item statusbar-saved">
          <span className="statusbar-dot" />
          Сохранено
        </span>
        <span className="statusbar-divider" />
        <span className="statusbar-item">
          <Activity size={12} />
          Индекс: 82%
        </span>
        <span className="statusbar-divider" />
        <span className="statusbar-item">Режим: План</span>
      </div>
      <div className="statusbar-right">
        <span className="statusbar-item">
          <Save size={12} />
          Ctrl+S
        </span>
        <span className="statusbar-divider" />
        <span className="statusbar-item">{dateStr}</span>
        <span className="statusbar-divider" />
        <span className="statusbar-item">{timeStr}</span>
      </div>
    </footer>
  );
}
