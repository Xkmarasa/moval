import { useState, useCallback } from 'react';

export const useReports = (role, apiBase) => {
  const [toolReports, setToolReports] = useState([]);
  const [initialReports, setInitialReports] = useState([]);
  const [packagingReports, setPackagingReports] = useState([]);
  const [productionReports, setProductionReports] = useState([]);
  const [weightReports, setWeightReports] = useState([]);
  const [cleaningReports, setCleaningReports] = useState([]);
  const [cleaningPlantReports, setCleaningPlantReports] = useState([]);
  const [visitorsBookReports, setVisitorsBookReports] = useState([]);
  const [witnessReports, setWitnessReports] = useState([]);
  const [receptionExitReports, setReceptionExitReports] = useState([]);
  const [controlResiduesReports, setControlResiduesReports] = useState([]);
  const [controlExpeditionReports, setControlExpeditionReports] = useState([]);
  const [controlAguaDiarioReports, setControlAguaDiarioReports] = useState([]);
  const [controlAguaSemanalReports, setControlAguaSemanalReports] = useState([]);
  const [controlAguaMensualReports, setControlAguaMensualReports] = useState([]);
  const [controlAguaTrimestralReports, setControlAguaTrimestralReports] = useState([]);
  const [satisfactionForms, setSatisfactionForms] = useState([]);
  const [revisionReports, setRevisionReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);

  const fetchReportsByType = useCallback(async (type) => {
    if (role !== 'admin') return;
    
    setReportsLoading(true);
    setReportsError(null);
    
    try {
      let endpoint = '';
      switch (type) {
        case 'herramientas':
          endpoint = 'listToolReports';
          break;
        case 'inicial':
          endpoint = 'listInitialReports';
          break;
        case 'envasado':
          endpoint = 'listPackagingReports';
          break;
        case 'produccion':
          endpoint = 'listProductionReports';
          break;
        case 'peso':
          endpoint = 'listWeightReports';
          break;
        case 'limpieza':
          endpoint = 'listCleaningReports';
          break;
        case 'limpieza_planta':
          endpoint = 'listCleaningPlantReports';
          break;
        case 'testigos':
          endpoint = 'listWitnessReports';
          break;
        case 'libro_visitas':
          endpoint = 'listVisitorsBookReports';
          break;
        case 'recepcion_salida':
          endpoint = 'listReceptionExitReports';
          break;
        case 'control_residuos':
          endpoint = 'listControlResiduesReports';
          break;
        case 'control_expedicion':
          endpoint = 'listControlExpeditionReports';
          break;
        case 'control_agua_diario':
          endpoint = 'listControlAguaDiarioReports';
          break;
        case 'control_agua_semanal':
          endpoint = 'listControlAguaSemanalReports';
          break;
        case 'control_agua_mensual':
          endpoint = 'listControlAguaMensualReports';
          break;
        case 'control_agua_trimestral':
          endpoint = 'listControlAguaTrimestralReports';
          break;
        case 'satisfaccion':
          endpoint = 'listCustomerSatisfactionForms';
          break;
        case 'revision':
          endpoint = 'listInformesRevision';
          break;
        default:
          return;
      }
      
      const url = `${apiBase}/${endpoint}?limit=200`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `Error ${response.status}` };
        }
        throw new Error(errorData.message || `Error al cargar informes: ${response.status}`);
      }
      const data = await response.json();
      
      // Handle revision report response (object with pagination)
      if (type === 'revision') {
        if (data.reports) {
          setRevisionReports(data.reports);
        } else {
          setRevisionReports(data);
        }
        setReportsLoading(false);
        return;
      }
      
      if (!Array.isArray(data)) {
        console.warn(`Expected array but got:`, typeof data, data);
        setReportsLoading(false);
        return;
      }
      
      switch (type) {
        case 'herramientas':
          setToolReports(data);
          break;
        case 'inicial':
          setInitialReports(data);
          break;
        case 'envasado':
          setPackagingReports(data);
          break;
        case 'produccion':
          setProductionReports(data);
          break;
        case 'peso':
          setWeightReports(data);
          break;
        case 'limpieza':
          setCleaningReports(data);
          break;
        case 'limpieza_planta':
          setCleaningPlantReports(data);
          break;
        case 'testigos':
          setWitnessReports(data);
          break;
        case 'libro_visitas':
          setVisitorsBookReports(data);
          break;
        case 'recepcion_salida':
          setReceptionExitReports(data);
          break;
        case 'control_residuos':
          setControlResiduesReports(data);
          break;
        case 'control_expedicion':
          setControlExpeditionReports(data);
          break;
        case 'control_agua_diario':
          setControlAguaDiarioReports(data);
          break;
        case 'control_agua_semanal':
          setControlAguaSemanalReports(data);
          break;
        case 'control_agua_mensual':
          setControlAguaMensualReports(data);
          break;
        case 'control_agua_trimestral':
          setControlAguaTrimestralReports(data);
          break;
        case 'satisfaccion':
          setSatisfactionForms(data);
          break;
      }
    } catch (error) {
      setReportsError(error.message);
      console.error('Error fetching reports:', error);
    } finally {
      setReportsLoading(false);
    }
  }, [apiBase, role]);

  const deleteReport = useCallback(async (reportType, reportId) => {
    let endpoint = '';
    switch (reportType) {
      case 'herramientas':
        endpoint = 'deleteToolReport';
        break;
      case 'inicial':
        endpoint = 'deleteInitialReport';
        break;
      case 'envasado':
        endpoint = 'deletePackagingReport';
        break;
      case 'produccion':
        endpoint = 'deleteProductionReport';
        break;
      case 'peso':
        endpoint = 'deleteWeightReport';
        break;
      case 'limpieza':
        endpoint = 'deleteCleaningReport';
        break;
      case 'limpieza_planta':
        endpoint = 'deleteCleaningPlantReport';
        break;
      case 'control_residuos':
        endpoint = 'deleteControlResiduesReport';
        break;
      case 'control_expedicion':
        endpoint = 'deleteControlExpeditionReport';
        break;
      case 'control_agua_diario':
        endpoint = 'deleteControlAguaDiarioReport';
        break;
      case 'control_agua_semanal':
        endpoint = 'deleteControlAguaSemanalReport';
        break;
      case 'control_agua_mensual':
        endpoint = 'deleteControlAguaMensualReport';
        break;
      case 'control_agua_trimestral':
        endpoint = 'deleteControlAguaTrimestralReport';
        break;
      case 'satisfaccion':
        endpoint = 'deleteCustomerSatisfactionForm';
        break;
      case 'testigos':
        endpoint = 'deleteWitnessReport';
        break;
      case 'libro_visitas':
        endpoint = 'deleteVisitorsBookReport';
        break;
      case 'recepcion_salida':
        endpoint = 'deleteReceptionExitReport';
        break;
      case 'revision':
        endpoint = 'deleteInformeRevision';
        break;
      default:
        return { success: false, error: 'Tipo de informe desconocido' };
    }

    try {
      const response = await fetch(`${apiBase}/${endpoint}?id=${reportId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error al eliminar el informe');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [apiBase]);

  return {
    toolReports,
    initialReports,
    packagingReports,
    productionReports,
    weightReports,
    cleaningReports,
    cleaningPlantReports,
    visitorsBookReports,
    witnessReports,
    receptionExitReports,
    controlResiduesReports,
    controlExpeditionReports,
    controlAguaDiarioReports,
    controlAguaSemanalReports,
    controlAguaMensualReports,
    controlAguaTrimestralReports,
    satisfactionForms,
    revisionReports,
    reportsLoading,
    reportsError,
    fetchReportsByType,
    deleteReport,
  };
};

export default useReports;

