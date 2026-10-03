import { useEffect, useState } from 'react';
import { financeService } from './financeService.js';

export default function useMonthlyReports(userId) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const reload = () => { if (!document.hidden) setRevision(r => r + 1); };
    const timer = window.setInterval(reload, 60000);
    window.addEventListener('focus', reload);
    return () => { clearInterval(timer); window.removeEventListener('focus', reload); };
  }, []);
  useEffect(() => {
    let active = true;
    financeService.listMonthlyReports(userId).then(rows => {
      if (active) { setReports(rows); setError(''); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, revision]);
  return { reports, loading, error, retry: () => setRevision(r => r + 1) };
}
