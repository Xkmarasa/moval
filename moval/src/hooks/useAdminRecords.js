import { useState, useEffect, useRef, useCallback } from 'react';

export const useAdminRecords = (role, apiBase) => {
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    hoursToday: 0,
  });
  const [totalWorkedHours, setTotalWorkedHours] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (role !== 'admin') return;
    
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await fetch(`${apiBase}/listEntries?limit=50`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo obtener el registro');
      }
      setAdminRecords(data);
      const totalHours = data.reduce(
        (sum, record) => sum + (record.worked_hours || 0),
        0,
      );
      setTotalWorkedHours(Math.round(totalHours * 100) / 100);
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminLoading(false);
    }
  }, [apiBase, role]);

  const fetchStats = useCallback(async () => {
    if (role !== 'admin') return;
    
    setStatsLoading(true);
    try {
      const response = await fetch(`${apiBase}/getStats`);
      const data = await response.json();
      if (response.ok) {
        const adjustedData = {
          ...data,
          activeEmployees: Math.max(0, (data.activeEmployees || 0) - 1),
        };
        setStats(adjustedData);
      }
    } catch (error) {
      console.warn('Failed to fetch stats', error);
    } finally {
      setStatsLoading(false);
    }
  }, [apiBase, role]);

  useEffect(() => {
    if (role !== 'admin') {
      return;
    }
    fetchRecords();
    fetchStats();
  }, [role, apiBase, fetchRecords, fetchStats]);

  const deleteRecord = useCallback(async (recordId) => {
    try {
      const response = await fetch(`${apiBase}/deleteEntry?id=${recordId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error al eliminar el registro');
      }
      setAdminRecords(prev => prev.filter(r => r.id !== recordId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [apiBase]);

  const updateRecord = useCallback(async (recordId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateEntry?id=${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error al actualizar el registro');
      }
      setAdminRecords(prev => prev.map(r => r.id === recordId ? {...r, ...data} : r));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [apiBase]);

  const pendingRecords = adminRecords.filter(
    (record) => record.check_in && !record.check_out,
  );
  const completedRecords = adminRecords.filter(
    (record) => record.check_in && record.check_out,
  );

  return {
    adminRecords,
    adminLoading,
    adminError,
    stats,
    totalWorkedHours,
    statsLoading,
    pendingRecords,
    completedRecords,
    fetchRecords,
    fetchStats,
    deleteRecord,
    updateRecord,
  };
};

export default useAdminRecords;
