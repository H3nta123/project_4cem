import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
        <StatusBar />
      </div>
    </div>
  );
}
