import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

const ReportsManagement = ({ 
  activeTab, 
  setActiveTab,
  reportsLoading, 
  reportsError,
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
  onViewReport,
  onEditReport,
  onDeleteReport,
  fetchReportsByType
}) => {
  const [selectedReportIndex, setSelectedReportIndex] = useState(null);
  const reportTabs = [
    { id: 'herramientas', label: '🔧 Herramientas' },
    { id: 'inicial', label: '📋 Inicial' },
    { id: 'envasado', label: '📦 Envasado' },
    { id: 'produccion', label: '🏭 Producción' },
    { id: 'peso', label: '⚖️ Peso Producto' },
    { id: 'limpieza', label: '🧹 Limpieza' },
    { id: 'limpieza_planta', label: '🏭 Limpieza Planta' },
    { id: 'testigos', label: '🧲 Testigos' },
    { id: 'libro_visitas', label: '📖 Libro visitas' },
    { id: 'recepcion_salida', label: '🚚 Recepción/Salida' },
    { id: 'control_residuos', label: '♻️ Control residuos' },
    { id: 'control_expedicion', label: '📦 Control expedición' },
    { id: 'control_agua_diario', label: '💧 Control agua diario' },
    { id: 'control_agua_semanal', label: '💧 Control agua semanal' },
    { id: 'control_agua_mensual', label: '💧 Control agua mensual' },
    { id: 'control_agua_trimestral', label: '💧 Control agua trimestral' },
    { id: 'satisfaccion', label: '😊 Satisfacción cliente' },
    { id: 'revision', label: '📝 Revisión' },
  ];

  useEffect(() => {
    if (activeTab) {
      fetchReportsByType(activeTab);
    }
    // Reset selection when changing tabs
    setSelectedReportIndex(null);
  }, [activeTab, fetchReportsByType]);

  // Also reset selection when reports data changes
  useEffect(() => {
    setSelectedReportIndex(null);
  }, [toolReports, initialReports, packagingReports, productionReports, weightReports, cleaningReports, cleaningPlantReports, visitorsBookReports, witnessReports, receptionExitReports, controlResiduesReports, controlExpeditionReports, controlAguaDiarioReports, controlAguaSemanalReports, controlAguaMensualReports, controlAguaTrimestralReports, satisfactionForms, revisionReports]);

  const getReports = () => {
    switch (activeTab) {
      case 'herramientas': return toolReports;
      case 'inicial': return initialReports;
      case 'envasado': return packagingReports;
      case 'produccion': return productionReports;
      case 'peso': return weightReports;
      case 'limpieza': return cleaningReports;
      case 'limpieza_planta': return cleaningPlantReports;
      case 'testigos': return witnessReports || [];
      case 'libro_visitas': return visitorsBookReports;
      case 'recepcion_salida': return receptionExitReports;
      case 'control_residuos': return controlResiduesReports;
      case 'control_expedicion': return controlExpeditionReports;
      case 'control_agua_diario': return controlAguaDiarioReports;
      case 'control_agua_semanal': return controlAguaSemanalReports;
      case 'control_agua_mensual': return controlAguaMensualReports;
      case 'control_agua_trimestral': return controlAguaTrimestralReports;
      case 'satisfaccion': return satisfactionForms;
      case 'revision': return revisionReports;
      default: return [];
    }
  };

  const getEmployeeName = (report) => {
    return (
      (report && (report.firmaNombreEmpleado || (report.datosCompletos && report.datosCompletos.firmaNombreEmpleado))) ||
      report?.employeeName || report?.employee || report?.employee_id || ''
    );
  };

  const normalizeWitnessTypes = (tipoTestigo) => {
    if (Array.isArray(tipoTestigo)) {
      return tipoTestigo.filter((value) => value && String(value).trim() !== '');
    }
    if (typeof tipoTestigo === 'string' && tipoTestigo.trim() !== '') {
      return [tipoTestigo.trim()];
    }
    return [];
  };

  const yesNoFromValue = (value) => {
    if (value === true) return 'SI';
    if (typeof value === 'string' && value.toUpperCase() === 'SI') return 'SI';
    return 'NO';
  };

  const applyHeaderStyle = (worksheet) => {
    if (!worksheet || !worksheet['!ref']) return;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ c: C, r: 0 });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: '012B5C' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true },
      };
    }
  };

  const getRevisionExcelData = (reports) => {
    return reports.map((report) => {
      const summary = report.conformitySummary || {};
      
      // Build detailed sections data as string
      let sectionsData = '';
      let puntosDetallados = '';
      
      if (report.sections && Array.isArray(report.sections)) {
        report.sections.forEach((section) => {
          const sectionTitle = section.title || '';
          sectionsData += sectionTitle + '; ';
          
          if (section.points && Array.isArray(section.points)) {
            section.points.forEach((point) => {
              const label = point.label || '';
              const value = point.value || point.estado || '';
              const comments = point.comments || point.comentarios || '';
              puntosDetallados += `${label}: ${value}${comments ? ' (' + comments + ')' : ''}; `;
            });
          }
        });
      }
      
      // Get all comments
      const allComments = report.sections?.flatMap(s => 
        s.points?.flatMap(p => p.comments || p.comentarios ? [`${p.label}: ${p.comments || p.comentarios}`] : []) || []
      ).join(' | ') || '';
      
      return {
        Empleado: report.employee_id || '',
        Fecha: report.fecha || '',
        Hora: report.hora || '',
        'Total Puntos': summary.total || 0,
        Conforme: summary.conforme || 0,
        'No Conforme': summary.noConforme || 0,
        'N/A': summary.na || 0,
        Secciones: sectionsData,
        'Puntos Detallados': puntosDetallados,
        Comentarios: allComments,
        'Firma Empleado': report.firmaInfo?.firmaEmpleado?.nombre || '',
        'URL Firma Empleado': report.firmaInfo?.firmaEmpleado?.url || '',
        'Firma Responsable': report.firmaInfo?.firmaResponsable?.nombre || '',
        'Nombre Responsable': report.firmaNombreResponsable || '',
        'URL Firma Responsable': report.firmaInfo?.firmaResponsable?.url || '',
        'Fecha Creación': report.createdAt ? new Date(report.createdAt).toLocaleString() : '',
      };
    });
  };

  const exportToExcel = () => {
    const reports = getReports();
    if (reports.length === 0) return;

    let dataForExcel = reports;

    if (activeTab === 'revision') {
      dataForExcel = getRevisionExcelData(reports);
    } else if (activeTab === 'peso') {
      const TOTAL_PESOS = 80;
      dataForExcel = reports.map((report) => {
        const row = {
          Empleado: report.employee_id,
          Fecha: report.fecha,
          Hora: report.hora,
          Envase: report.envaseCantidad || '',
          Promedio: report.promedio ?? '',
          Minimo: report.min ?? '',
          Maximo: report.max ?? '',
          FirmaDropbox: report.firmaInfo?.sharedLink || '',
        };
        const pesos = Array.isArray(report.pesos) ? report.pesos : [];
        for (let i = 0; i < TOTAL_PESOS; i++) {
          row[`Peso_${i + 1}`] = pesos[i] ?? '';
        }
        return row;
      });
    } else if (activeTab === 'produccion') {
      dataForExcel = reports.map((report) => {
        const checklist = report.datosCompletos?.checklistComponentes || report.checklistComponentes || report.checklist || {};
        return {
          Empleado: report.employee_id,
          Fecha: report.fecha,
          Hora: report.hora,
          Producto: report.tipoProducto ?? '',
          Color: report.color ?? '',
          Olor: report.olor ?? '',
          Sabor: report.sabor ?? '',
          Textura: report.textura ?? '',
          'pH (PCC2)': report.phPcc2 ?? report.datosCompletos?.phPcc2 ?? '',
          'Número campaña': report.numeroCampana ?? report.datosCompletos?.numeroCampana ?? '',
          Aceite: yesNoFromValue(checklist.aceite),
          Huevo: yesNoFromValue(checklist.huevo),
          Yema: yesNoFromValue(checklist.yema),
          Ajo: yesNoFromValue(checklist.ajo),
          Sal: yesNoFromValue(checklist.sal),
          Limon: yesNoFromValue(checklist.limon),
          Sorbato: yesNoFromValue(checklist.sorbato),
          Xantana: yesNoFromValue(checklist.xantana),
          Colorante: yesNoFromValue(checklist.colorante),
          Benzoato: yesNoFromValue(checklist.benzoato),
          FirmaDropbox: report.firmaInfo?.sharedLink || '',
        };
      });
    } else if (activeTab === 'testigos') {
      dataForExcel = reports.map((report) => {
        const selected = normalizeWitnessTypes(report.tipoTestigo);
        return {
          Empleado: report.employee_id,
          Fecha: report.fecha,
          Hora: report.hora,
          'Testigo FE': selected.includes('FE') ? 'SI' : 'NO',
          'Testigo INOX': selected.includes('INOX') ? 'SI' : 'NO',
          'Testigo NO INOX': selected.includes('NO_INOX') ? 'SI' : 'NO',
          FirmaDropbox: report.firmaInfo?.sharedLink || '',
        };
      });
    } else if (activeTab === 'libro_visitas') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        HoraEntrada: report.horaEntrada || '',
        HoraSalida: report.horaSalida || '',
        NombreApellidos: report.nombreApellidos || '',
        DNI: report.dni || '',
        Empresa: report.empresa || '',
        MotivoVisita: report.motivoVisita || '',
        HaLeidoNormas: report.haLeidoNormas || '',
        'Firma Visitante': report.firmaNombreVisitante || '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'herramientas') {
      dataForExcel = reports.map((report) => {
        const fotosLinks = (report.fotos || [])
          .filter((f) => f.dropboxPath)
          .map((f) => f.sharedLink || `https://www.dropbox.com/home${encodeURI(f.dropboxPath)}`)
          .join(' ; ');
        return {
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          TipoRegistro: report.tipoRegistro === 'MANTENIMIENTO_EXTERNO' ? 'MANTENIMIENTO EXTERNO' : 'HERRAMIENTAS ENVASADORAS (SEMANAL)',
          EmpresaTecnico: report.empresaTecnico || '',
          Kit: report.kit || '',
          ChecklistEntrada: report.checklistEntrada,
          ChecklistSalida: report.checklistSalida,
          RutaFotos: fotosLinks,
          NoConformidad: report.noConformidad,
          FirmaDropbox: report.firmaInfo?.sharedLink || '',
        };
      });
    } else if (activeTab === 'inicial') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        InstalacionesLimpias: report.instalacionesLimpias || '',
        ManipuladoresUniformados: report.manipuladoresUniformados || '',
        PeloProtegido: report.peloProtegido || '',
        UnasLimpias: report.unasLimpias || '',
        ElementosTamiz: report.elementosTamiz || '',
        CalibracionPHMetro: report.calibracionPHMetro || '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'envasado') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        ParadasEmergencia: report.checklist?.paradasEmergencia || report.paradasEmergencia || '',
        IntegridadBoquillas: report.checklist?.integridadBoquillas || report.integridadBoquillas || '',
        FechaLoteImpresos: report.checklist?.fechaLoteImpresos || report.fechaLoteImpresos || '',
        FechaLoteLegibles: report.checklist?.fechaLoteLegibles || report.fechaLoteLegibles || '',
        EnvasesCierran: report.checklist?.envasesCierran || report.envasesCierran || '',
        EtiquetaCorrecta: report.checklist?.etiquetaCorrecta || report.etiquetaCorrecta || '',
        UnidadesCaja: report.checklist?.unidadesCaja || report.unidadesCaja || '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'limpieza') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        ControlSuperficies: report.controlSuperficies ? 'Correcto' : 'Incorrecto',
        DesengrasantePorLitro: report.desengrasantePorLitro ?? '',
        DesinfectantePorLitro: report.desinfectantePorLitro ?? '',
        PhAclarado: report.phAclarado ?? '',
        PhGrifo: report.phGrifo ?? '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'limpieza_planta') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        Zona: (report.zonaNombre || report.zona) ?? '',
        Periodo: report.periodo || 'SEMANAL',
        LimpiezaCompletada: report.limpiezaCompletada ? 'Sí' : 'No',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'recepcion_salida') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        TipoMovimiento: report.tipoMovimiento === 'E' ? 'Entrada' : 'Salida',
        Empresa: report.empresa || '',
        NombreTransportista: report.nombreTransportista || '',
        DNIMatricula: report.dniMatricula || '',
        Fecha: report.fecha,
        Hora: report.hora,
        Producto: report.producto || '',
        IdentificacionProducto: report.identificacionProducto === 'SI' ? 'SI' : report.identificacionProducto === 'NO' ? 'NO' : report.identificacionProducto ? 'SI' : 'NO',
        EstadoCajas: report.estadoCajas || '',
        Bultos: report.bultos || '',
        Palets: report.palets || '',
        Temperatura: report.temperatura || '',
        HigieneCamion: report.higieneCamion || '',
        EstadoPalets: report.estadoPalets || '',
        Aceptado: report.aceptado || '',
        QuienRecepciona: report.quienRecepciona || '',
        NombreConductor: report.nombreConductor || '',
        NumeroAlbaran: report.numeroAlbaran || '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'control_residuos') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        PaletsCarton: report.paletsCarton ?? '',
        PaletsPlastico: report.paletsPlastico ?? '',
        PaletsFilm: report.paletsFilm ?? '',
        Responsable: report.nombreResponsable || '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'control_expedicion') {
      dataForExcel = reports.map((report) => ({
        Id: report.id,
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        Producto: report.producto ?? '',
        Lote: report.lote ?? '',
        NumeroPalet: report.numeroPalet ?? '',
        CajasSueltas: report.cajasSueltas ?? '',
        PaletIntegro: report.paletIntegro ?? '',
        FlejadoOK: report.flejadoOK ?? '',
        EtiquetaCorrecta: report.etiquetaCorrecta ?? '',
        ConteoCorrecto: report.conteoCorrecto ?? '',
        Responsable: report.responsable ?? '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
        CreatedAt: report.createdAt ? new Date(report.createdAt).toISOString() : '',
        UpdatedAt: report.updatedAt ? new Date(report.updatedAt).toISOString() : '',
      }));
    } else if (activeTab === 'control_agua_diario') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        'Temperatura Calentador (≥60ºC)': report.temperaturaCalentador ?? '',
        'Cloro Depósito (0,2-1 PPM)': report.cloroDeposito ?? '',
        'pH Depósito (6,5-8,5)': report.phDeposito ?? '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'control_agua_semanal') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        'Turbidez Calentador (<4 UNF)': report.turbidezCalentador ?? '',
        'Turbidez Depósito (<4 UNF)': report.turbidezDeposito ?? '',
        'Purga Puntos Poco Uso (Tº ≥ 50 ºC)': report.purgaPuntos ?? '',
        'Turbidez Puntos Terminales (<4 UNF)': report.turbidezPuntos ?? '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'control_agua_mensual') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        'Suciedad o Corrosión': report.suciedadCorrosion ?? '',
        'Tº < 20 ºC (fría)': report.tempFria ?? '',
        'Tº ≥ 50 ºC (caliente)': report.tempCaliente ?? '',
        'Cloro 0,2-1': report.cloroPuntos ?? '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'control_agua_trimestral') {
      dataForExcel = reports.map((report) => ({
        Empleado: getEmployeeName(report),
        Fecha: report.fecha,
        Hora: report.hora,
        'Suciedad o Corrosión': report.suciedadCorrosion ?? '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
      }));
    } else if (activeTab === 'satisfaccion') {
      dataForExcel = reports.map((report) => ({
        Id: report.id,
        Cliente: report.cliente || '',
        Contacto: report.contacto || '',
        Email: report.email || '',
        Telefono: report.telefono || '',
        Canal: report.canal || '',
        Fecha: report.fecha || '',
        ISG: report.isg ?? '',
        Valora: report.valoras || '',
        Mejoras: report.mejoras || '',
        Comentarios: report.comentarios || '',
        A1: report.scores?.a1 || '',
        A2: report.scores?.a2 || '',
        A3: report.scores?.a3 || '',
        A4: report.scores?.a4 || '',
        A5: report.scores?.a5 || '',
        B1: report.scores?.b1 || '',
        B2: report.scores?.b2 || '',
        B3: report.scores?.b3 || '',
        B4: report.scores?.b4 || '',
        C1: report.scores?.c1 || '',
        C2: report.scores?.c2 || '',
        C3: report.scores?.c3 || '',
        D1: report.scores?.d1 || '',
        D2: report.scores?.d2 || '',
        FirmaDropbox: report.firmaInfo?.sharedLink || '',
        CreatedAt: report.createdAt ? new Date(report.createdAt).toISOString() : '',
        UpdatedAt: report.updatedAt ? new Date(report.updatedAt).toISOString() : '',
      }));
    }

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    applyHeaderStyle(ws);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informes');
    XLSX.writeFile(wb, `informes_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export revision report to Word
  const exportRevisionToWord = async (report) => {
    if (!report) return;

    const summary = report.conformitySummary || {};
    const sections = report.sections || [];

    // Helper function to create table cell
    const createCell = (text, isBold = false, isHeader = false, bgColor = null) => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: text || '-',
                bold: isBold,
                font: isHeader ? 'Arial' : 'Calibri',
                size: isHeader ? 24 : 22,
              }),
            ],
          }),
        ],
        shading: bgColor ? { fill: bgColor } : undefined,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        },
      });
    };

    // Build table rows from sections
    const tableRows = [
      // Header row
      new TableRow({
        children: [
          createCell('SECCIÓN', true, true, '012B5C'),
          createCell('PUNTO A SUPERVISAR', true, true, '012B5C'),
          createCell('CRITERIO DE ACEPTACIÓN', true, true, '012B5C'),
          createCell('ESTADO', true, true, '012B5C'),
          createCell('COMENTARIOS / ACCIÓN', true, true, '012B5C'),
        ],
      }),
    ];

    // Add data rows for each section
    sections.forEach((section) => {
      const sectionTitle = section.title || '';
      const points = section.points || [];

      points.forEach((point, pointIndex) => {
        const estado = point.value || point.estado || '';
        const comments = point.comments || point.comentarios || '';
        
        // Determine background color based on status
        let bgColor = null;
        if (estado === 'C') bgColor = 'DCFCE7'; // Green
        else if (estado === 'NC') bgColor = 'FEE2E2'; // Red
        else if (estado === 'NA') bgColor = 'F1F5F9'; // Gray

        // For first point in section, show section title
        const sectionCell = pointIndex === 0 
          ? createCell(sectionTitle, false, false, bgColor)
          : createCell('', false, false, bgColor);

        tableRows.push(
          new TableRow({
            children: [
              sectionCell,
              createCell(point.label || '', false, false, bgColor),
              createCell(point.criterio || point.criterion || '', false, false, bgColor),
              createCell(estado, true, false, bgColor),
              createCell(comments, false, false, bgColor),
            ],
          })
        );
      });
    });

    // Create the document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: 'INFORME DE REVISIÓN',
                  bold: true,
                  size: 36,
                  font: 'Arial',
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }), // Empty line

            // Report info
            new Paragraph({
              children: [
                new TextRun({ text: 'Fecha: ', bold: true }),
                new TextRun(report.fecha || '-'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Hora: ', bold: true }),
                new TextRun(report.hora || '-'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Empleado: ', bold: true }),
                new TextRun(report.employee_id || '-'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Firma Responsable: ', bold: true }),
                new TextRun(report.firmaNombreResponsable || '-'),
              ],
            }),
            new Paragraph({ text: '' }), // Empty line

            // Summary
            new Paragraph({
              children: [
                new TextRun({ text: 'RESUMEN DE CONFORMIDAD', bold: true, size: 24 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Total puntos: ${summary.total || 0}  |  ` }),
                new TextRun({ text: `Conforme (C): ${summary.conforme || 0}  |  ` }),
                new TextRun({ text: `No Conforme (NC): ${summary.noConforme || 0}  |  ` }),
                new TextRun({ text: `N/A: ${summary.na || 0}` }),
              ],
            }),
            new Paragraph({ text: '' }), // Empty line

            // Table
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({ text: '' }), // Empty line

            // Footer
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `Documento generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
                  italic: true,
                  size: 18,
                }),
              ],
            }),
          ],
        },
      ],
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `informe_revision_${report.fecha || 'sin_fecha'}_${report.employee_id || 'empleado'}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const reports = getReports();

  const getColumnHeaders = () => {
    const baseHeaders = ['Empleado', 'Fecha', 'Hora'];
    switch (activeTab) {
      case 'herramientas': return [...baseHeaders, 'Tipo'];
      case 'inicial': return [...baseHeaders, 'Instalaciones'];
      case 'envasado': return [...baseHeaders, 'Paradas Emergencia'];
      case 'produccion': return [...baseHeaders, 'Color'];
      case 'peso': return [...baseHeaders, 'Promedio'];
      case 'limpieza': return [...baseHeaders, 'Control Superficies'];
      case 'limpieza_planta': return [...baseHeaders, 'Zona', 'Periodo'];
      case 'testigos': return [...baseHeaders, 'Tipo Testigo'];
      case 'libro_visitas': return [...baseHeaders, 'Motivo Visita'];
      case 'recepcion_salida': return [...baseHeaders, 'Empresa', 'Nº Albarán'];
      case 'control_residuos': return [...baseHeaders, 'Palets Cartón'];
      case 'control_expedicion': return [...baseHeaders, 'Producto'];
      case 'control_agua_diario': return [...baseHeaders, 'Temp. Calentador'];
      case 'control_agua_semanal': return [...baseHeaders, 'Turbidez Calentador'];
      case 'control_agua_mensual': return [...baseHeaders, 'Suciedad/Corrosión'];
      case 'control_agua_trimestral': return [...baseHeaders, 'Suciedad/Corrosión'];
      case 'satisfaccion': return [...baseHeaders, 'Cliente', 'ISG'];
      case 'revision': return [...baseHeaders, 'Total', 'Conforme', 'No Conforme'];
      default: return baseHeaders;
    }
  };

  const getCellValue = (report, columnIndex) => {
    const baseColumns = 3;
    switch (activeTab) {
      case 'revision':
        if (columnIndex === baseColumns) {
          const summary = report.conformitySummary || {};
          return summary.total || 0;
        }
        if (columnIndex === baseColumns + 1) return (report.conformitySummary || {}).conforme || 0;
        if (columnIndex === baseColumns + 2) return (report.conformitySummary || {}).noConforme || 0;
        break;
      case 'herramientas':
        if (columnIndex === baseColumns) return report.tipoRegistro === 'MANTENIMIENTO_EXTERNO' ? 'Mantenimiento' : 'Herramientas';
        break;
      case 'inicial':
        if (columnIndex === baseColumns) return report.instalacionesLimpias;
        break;
      case 'envasado':
        if (columnIndex === baseColumns) return report.checklist?.paradasEmergencia || '-';
        break;
      case 'produccion':
        if (columnIndex === baseColumns) return report.color || '-';
        break;
      case 'peso':
        if (columnIndex === baseColumns) return report.promedio ? report.promedio.toFixed(2) : '-';
        break;
      case 'limpieza':
        if (columnIndex === baseColumns) return report.controlSuperficies ? 'Correcto' : 'Incorrecto';
        break;
      case 'limpieza_planta':
        if (columnIndex === baseColumns) return report.zonaNombre || report.zona || '-';
        if (columnIndex === baseColumns + 1) return report.periodo || 'SEMANAL';
        break;
      case 'testigos':
        if (columnIndex === baseColumns) return Array.isArray(report.tipoTestigo) ? report.tipoTestigo.join(', ') : report.tipoTestigo || '-';
        break;
      case 'libro_visitas':
        if (columnIndex === baseColumns) return report.motivoVisita || '-';
        break;
      case 'recepcion_salida':
        if (columnIndex === baseColumns) return report.empresa || '-';
        if (columnIndex === baseColumns + 1) return report.numeroAlbaran || '-';
        break;
      case 'control_residuos':
        if (columnIndex === baseColumns) return report.paletsCarton ?? '-';
        break;
      case 'control_expedicion':
        if (columnIndex === baseColumns) return report.producto || '-';
        break;
      case 'control_agua_diario':
        if (columnIndex === baseColumns) return report.temperaturaCalentador ?? '-';
        break;
      case 'control_agua_semanal':
        if (columnIndex === baseColumns) return report.turbidezCalentador ?? '-';
        break;
      case 'control_agua_mensual':
        if (columnIndex === baseColumns) return report.suciedadCorrosion ?? '-';
        break;
      case 'control_agua_trimestral':
        if (columnIndex === baseColumns) return report.suciedadCorrosion ?? '-';
        break;
      case 'satisfaccion':
        if (columnIndex === baseColumns) return report.cliente || '-';
        if (columnIndex === baseColumns + 1) return report.isg ?? '-';
        break;
    }
    return null;
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Gestión de Informes</h2>
        <p>Visualiza, edita, elimina y exporta todos los informes.</p>
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="admin-report-select" style={{ display: 'block', marginBottom: '0.5rem', color: '#475569' }}>Selecciona el informe</label>
        <select 
          id="admin-report-select" 
          value={activeTab || ''} 
          onChange={(e) => setActiveTab(e.target.value)} 
          style={{ width: '100%', maxWidth: '360px', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontWeight: 500 }}
        >
          <option value="" disabled>Selecciona...</option>
          {reportTabs.map((tab) => (<option key={tab.id} value={tab.id}>{tab.label}</option>))}
        </select>
      </div>
      {reportsLoading && <p>Cargando informes...</p>}
      {reportsError && <div className="panel__error"><p>Error al cargar informes: {reportsError}</p><button type="button" className="dk-btn dk-btn--ghost" onClick={() => fetchReportsByType(activeTab)} style={{ marginTop: '0.5rem' }}>Reintentar</button></div>}
      {!reportsLoading && !reportsError && reports.length > 0 && (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="dk-btn dk-btn--primary" onClick={exportToExcel} style={{ padding: '0.5rem 1rem' }}>
              📊 Exportar a Excel
            </button>
            {activeTab === 'revision' && (
              <button 
                type="button" 
                className="dk-btn dk-btn--primary" 
                onClick={() => {
                  if (selectedReportIndex !== null && reports[selectedReportIndex]) {
                    exportRevisionToWord(reports[selectedReportIndex]);
                  } else if (reports.length === 1) {
                    // Auto-select if there's only one report
                    exportRevisionToWord(reports[0]);
                  } else {
                    alert('Selecciona un informe de la lista para exportar a Word');
                  }
                }}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#1e40af', borderColor: '#1e40af' }}
              >
                📄 Exportar a Word
              </button>
            )}
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Total: {reports.length} informe(s)</span>
          </div>
          <div className="records-table-wrapper">
            <table className="records-table">
              <thead>
                <tr>
                  {activeTab === 'revision' && <th style={{ width: '40px' }}>✓</th>}
                  {getColumnHeaders().map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                  <th style={{ minWidth: '160px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr key={report.id} style={{ backgroundColor: activeTab === 'revision' && selectedReportIndex === index ? '#e0f2fe' : undefined }}>
                    {activeTab === 'revision' && (
                      <td>
                        <input 
                          type="radio" 
                          name="selectedReport"
                          checked={selectedReportIndex === index}
                          onChange={() => setSelectedReportIndex(index)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                      </td>
                    )}
                    <td>{report.employee_id}</td>
                    <td>{report.fecha}</td>
                    <td>{report.hora}</td>
                    {getColumnHeaders().slice(3).map((_, idx) => {
                      const value = getCellValue(report, 3 + idx);
                      return <td key={idx}>{value !== null ? value : '-'}</td>;
                    })}
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                        <button type="button" className="dk-btn dk-btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minWidth: '85px', backgroundColor: '#ffffff', border: '2px solid rgba(13, 34, 66, 0.3)', fontWeight: '600' }} onClick={() => onViewReport(report)}>👁️ Ver</button>
                        <button type="button" className="dk-btn dk-btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minWidth: '85px', backgroundColor: '#ffffff', border: '2px solid rgba(13, 34, 66, 0.3)', fontWeight: '600' }} onClick={() => onEditReport(report)}>✏️ Editar</button>
                        <button type="button" className="dk-btn dk-btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#c62828', borderColor: '#c62828', borderWidth: '2px', minWidth: '85px', backgroundColor: '#ffffff', fontWeight: '600' }} onClick={() => onDeleteReport(report.id)}>🗑️ Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!reportsLoading && !reportsError && reports.length === 0 && activeTab && (
        <p>No hay informes de este tipo.</p>
      )}
    </section>
  );
};

export default ReportsManagement;

