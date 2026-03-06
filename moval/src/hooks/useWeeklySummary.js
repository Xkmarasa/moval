import { useState, useCallback, useEffect } from 'react';

export const useWeeklySummary = (role, apiBase) => {
  const [weeklySummaryRows, setWeeklySummaryRows] = useState([]);
  const [weeklySummaryMeta, setWeeklySummaryMeta] = useState(null);
  const [weeklySummaryLoading, setWeeklySummaryLoading] = useState(false);
  const [weeklySummaryError, setWeeklySummaryError] = useState(null);
  const [productionTypes, setProductionTypes] = useState([]);

  const formatDate = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  };

  const getWeekRange = (referenceDate = new Date()) => {
    const date = new Date(referenceDate);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  };

  const getDateRange = (startValue, endValue) => {
    let start, end;
    
    if (startValue && endValue) {
      // Custom date range from params
      start = new Date(startValue);
      end = new Date(endValue);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (startValue && typeof startValue === 'object' && startValue.start && startValue.end) {
      // Object with start and end properties
      start = new Date(startValue.start);
      end = new Date(startValue.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to current week
      return getWeekRange();
    }
    
    return { start, end };
  };

  const parseReportDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const buildDeviationDetails = (reports, predicate) => {
    const deviated = reports.filter(predicate);
    const details = deviated.map((report) => {
      const fecha = report.fecha || '';
      const hora = report.hora || '';
      const empleado = report.employee_id || '';
      return `${fecha} ${hora} ${empleado}`.trim();
    });
    return {
      count: deviated.length,
      details,
    };
  };

  const fetchWeeklySummary = useCallback(async (dateRange = null) => {
    if (role !== 'admin') return;
    setWeeklySummaryLoading(true);
    setWeeklySummaryError(null);
    try {
      const { start, end } = getDateRange(dateRange?.start, dateRange?.end);
      const filterByWeek = (report) => {
        const date = parseReportDate(report.fecha);
        if (!date) return false;
        return date >= start && date <= end;
      };

      const fetchReports = async (endpoint) => {
        const response = await fetch(`${apiBase}/${endpoint}?limit=1000`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error || `Error al cargar ${endpoint}`);
        }
        return Array.isArray(data) ? data : [];
      };

      const [
        initialList,
        productionList,
        weightList,
        witnessList,
        cleaningList,
        cleaningPlantList,
        packagingList,
        controlExpeditionList,
      ] = await Promise.all([
        fetchReports('listInitialReports'),
        fetchReports('listProductionReports'),
        fetchReports('listWeightReports'),
        fetchReports('listWitnessReports'),
        fetchReports('listCleaningReports'),
        fetchReports('listCleaningPlantReports'),
        fetchReports('listPackagingReports'),
        fetchReports('listControlExpeditionReports'),
      ]);

      const initialReportsWeek = initialList.filter(filterByWeek);
      const productionReportsWeek = productionList.filter(filterByWeek);
      const weightReportsWeek = weightList.filter(filterByWeek);
      const witnessReportsWeek = witnessList.filter(filterByWeek);
      const cleaningReportsWeek = cleaningList.filter(filterByWeek);
      const cleaningPlantReportsWeek = cleaningPlantList.filter(filterByWeek);
      const packagingReportsWeek = packagingList.filter(filterByWeek);
      const controlExpeditionReportsWeek = controlExpeditionList.filter(filterByWeek);

      // Extract unique production types
      const uniqueTypes = [...new Set(productionReportsWeek
        .map(report => report.tipoProducto)
        .filter(Boolean)
        .map(type => type.toUpperCase())
      )];
      setProductionTypes(uniqueTypes);

      const normalizeEnvase = (value) => String(value || '').toUpperCase().replace(/\s+/g, ' ').trim();
      const getWeightAverage = (report) => {
        if (report.promedio !== undefined && report.promedio !== null) {
          const num = Number(report.promedio);
          return Number.isNaN(num) ? NaN : num;
        }
        if (report.resumenPesos && report.resumenPesos.promedio !== undefined) {
          const num = Number(report.resumenPesos.promedio);
          return Number.isNaN(num) ? NaN : num;
        }
        return NaN;
      };
      const weightTargets = {
        '165 ML': 165,
        '200 ML': 200,
        '2000 ML': 2000,
        '3600 ML': 3600,
      };
      const isSmallEnvase = (envase) => envase === '165 ML' || envase === '200 ML';
      const isLargeEnvase = (envase) => envase === '2000 ML' || envase === '3600 ML';
      const buildWeightDeviation = (reports, tolerance) => {
        const deviated = [];
        reports.forEach((report) => {
          const envase = normalizeEnvase(report.envaseCantidad);
          const target = weightTargets[envase];
          const promedio = getWeightAverage(report);
          if (!target || Number.isNaN(promedio)) {
            return;
          }
          const diffRatio = Math.abs(promedio - target) / target;
          if (diffRatio > tolerance) {
            deviated.push({
              ...report,
              _envase: envase,
              _promedio: promedio,
            });
          }
        });
        const details = deviated.map((report) => {
          const fecha = report.fecha || '';
          const hora = report.hora || '';
          const empleado = report.employee_id || '';
          return `${fecha} ${hora} ${empleado} (${report._envase}=${report._promedio})`.trim();
        });
        return {
          count: deviated.length,
          details,
        };
      };

      const initialDeviation = buildDeviationDetails(initialReportsWeek, (report) => (
        report.instalacionesLimpias === 'NO' ||
        report.manipuladoresUniformados === 'NO' ||
        report.peloProtegido === 'NO' ||
        report.unasLimpias === 'NO' ||
        report.elementosTamiz === 'NO' ||
        report.calibracionPHMetro === 'NO'
      ));

      const packagingDeviation = buildDeviationDetails(packagingReportsWeek, (report) => (
        report.checklist?.paradasEmergencia === 'NO' ||
        report.checklist?.integridadBoquillas === 'NO' ||
        report.checklist?.fechaLoteImpresos === 'NO' ||
        report.checklist?.fechaLoteLegibles === 'NO' ||
        report.checklist?.envasesCierran === 'NO' ||
        report.checklist?.etiquetaCorrecta === 'NO' ||
        report.checklist?.unidadesCaja === 'NO' ||
        report.paradasEmergencia === 'NO' ||
        report.integridadBoquillas === 'NO' ||
        report.fechaLoteImpresos === 'NO' ||
        report.fechaLoteLegibles === 'NO' ||
        report.envasesCierran === 'NO' ||
        report.etiquetaCorrecta === 'NO' ||
        report.unidadesCaja === 'NO'
      ));

      const controlExpeditionDeviation = buildDeviationDetails(controlExpeditionReportsWeek, (report) => (
        report.paletIntegro === 'NO' ||
        report.flejadoOK === 'NO' ||
        report.etiquetaCorrecta === 'NO' ||
        report.conteoCorrecto === 'NO'
      ));

      const productionDeviation = buildDeviationDetails(productionReportsWeek, (report) => {
        const noAceptable = [
          report.color,
          report.olor,
          report.sabor,
          report.textura,
        ].some((value) => value === 'NO_ACEPTABLE');
        const tipoProducto = report.tipoProducto || '';
        const limitePh = tipoProducto === 'MAYONESA' ? 4.2 : 4.4;
        const phValue = Number(report.phPcc2);
        const phAlto = !Number.isNaN(phValue) && phValue > limitePh;
        return noAceptable || phAlto;
      });

      const witnessDeviation = buildDeviationDetails(witnessReportsWeek, (report) => {
        const selected = Array.isArray(report.tipoTestigo) ? report.tipoTestigo : [];
        return !selected.includes('FE') || !selected.includes('INOX') || !selected.includes('NO_INOX');
      });

      const weightSmallReports = weightReportsWeek.filter((report) => {
        const envase = normalizeEnvase(report.envaseCantidad);
        return isSmallEnvase(envase);
      });
      const weightLargeReports = weightReportsWeek.filter((report) => {
        const envase = normalizeEnvase(report.envaseCantidad);
        return isLargeEnvase(envase);
      });
      const weightSmallDeviation = buildWeightDeviation(weightSmallReports, 0.045);
      const weightLargeDeviation = buildWeightDeviation(weightLargeReports, 0.015);

      const rows = [
        {
          area: 'Control inicial planta',
          registros: initialReportsWeek.length,
          desviaciones: initialDeviation,
        },
        {
          area: 'PCC2 – pH',
          registros: productionReportsWeek.length,
          desviaciones: productionDeviation,
        },
        {
          area: 'Control de pesos 1,9 kg',
          registros: weightLargeReports.length,
          desviaciones: weightLargeDeviation,
        },
        {
          area: 'Control de pesos 165 g',
          registros: weightSmallReports.length,
          desviaciones: weightSmallDeviation,
        },
        {
          area: 'Control testigos detector metales',
          registros: witnessReportsWeek.length,
          desviaciones: witnessDeviation,
        },
        {
          area: 'Control limpieza',
          registros: cleaningReportsWeek.length,
          desviaciones: { count: 0, details: [] },
        },
        {
          area: 'Limpieza planta',
          registros: cleaningPlantReportsWeek.length,
          desviaciones: { count: 0, details: [] },
        },
        {
          area: 'Control almacenado palets',
          registros: controlExpeditionReportsWeek.length,
          desviaciones: controlExpeditionDeviation,
        },
        {
          area: 'Control envasado',
          registros: packagingReportsWeek.length,
          desviaciones: packagingDeviation,
        },
      ];

      setWeeklySummaryRows(rows);
      setWeeklySummaryMeta({
        start,
        end,
      });
    } catch (error) {
      setWeeklySummaryError(error.message);
    } finally {
      setWeeklySummaryLoading(false);
    }
  }, [apiBase, role]);

  useEffect(() => {
    if (role === 'admin') {
      fetchWeeklySummary();
    }
  }, [role, apiBase, fetchWeeklySummary]);

  return {
    weeklySummaryRows,
    weeklySummaryMeta,
    weeklySummaryLoading,
    weeklySummaryError,
    fetchWeeklySummary,
    formatDate,
    productionTypes,
  };
};

export default useWeeklySummary;
