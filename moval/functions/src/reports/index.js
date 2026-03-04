/* eslint-disable require-jsdoc */
// Reports Module - Export all report endpoints

const witness = require("./witness");
const visitors = require("./visitors");
const reception = require("./reception");
const controlAgua = require("./controlAgua");
const controlResidues = require("./controlResidues");
const cleaning = require("./initial");
const packaging = require("./packaging");
const production = require("./production");
const weight = require("./weight");
const cleaningPlant = require("./cleaningPlant");
const controlExpedition = require("./controlExpedition");
const customerSatisfaction = require("./customerSatisfaction");
const initialReport = require("./initialReport");
const toolRegistration = require("./toolRegistration");
const revision = require("./revision");

module.exports = {
  // Witness Reports
  createWitnessReport: witness.createWitnessReport,
  listWitnessReports: witness.listWitnessReports,
  deleteWitnessReport: witness.deleteWitnessReport,

  // Visitors Book Reports
  createVisitorsBookReport: visitors.createVisitorsBookReport,
  listVisitorsBookReports: visitors.listVisitorsBookReports,
  saveVisitorsBookDraft: visitors.saveVisitorsBookDraft,
  getPendingVisitorsBookReport: visitors.getPendingVisitorsBookReport,
  deleteVisitorsBookReport: visitors.deleteVisitorsBookReport,

// Reception/Exit Reports
  createReceptionExitReport: reception.createReceptionExitReport,
  listReceptionExitReports: reception.listReceptionExitReports,
  deleteReceptionExitReport: reception.deleteReceptionExitReport,

  // Control Agua Reports
  createControlAguaDiarioReport: controlAgua.createControlAguaDiarioReport,
  listControlAguaDiarioReports: controlAgua.listControlAguaDiarioReports,
  deleteControlAguaDiarioReport: controlAgua.deleteControlAguaDiarioReport,
  updateControlAguaDiarioReport: controlAgua.updateControlAguaDiarioReport,

  createControlAguaSemanalReport: controlAgua.createControlAguaSemanalReport,
  listControlAguaSemanalReports: controlAgua.listControlAguaSemanalReports,
  deleteControlAguaSemanalReport: controlAgua.deleteControlAguaSemanalReport,
  updateControlAguaSemanalReport: controlAgua.updateControlAguaSemanalReport,

  createControlAguaMensualReport: controlAgua.createControlAguaMensualReport,
  listControlAguaMensualReports: controlAgua.listControlAguaMensualReports,
  deleteControlAguaMensualReport: controlAgua.deleteControlAguaMensualReport,
  updateControlAguaMensualReport: controlAgua.updateControlAguaMensualReport,

  createControlAguaTrimestralReport: controlAgua.createControlAguaTrimestralReport,
  listControlAguaTrimestralReports: controlAgua.listControlAguaTrimestralReports,
  deleteControlAguaTrimestralReport: controlAgua.deleteControlAguaTrimestralReport,
  updateControlAguaTrimestralReport: controlAgua.updateControlAguaTrimestralReport,

  // Control Residues Reports
  createControlResiduesReport: controlResidues.createControlResiduesReport,
  listControlResiduesReports: controlResidues.listControlResiduesReports,
  updateControlResiduesReport: controlResidues.updateControlResiduesReport,
  deleteControlResiduesReport: controlResidues.deleteControlResiduesReport,

  // Cleaning Reports
  createCleaningReport: cleaning.createCleaningReport,
  listCleaningReports: cleaning.listCleaningReports,
  updateCleaningReport: cleaning.updateCleaningReport,
  deleteCleaningReport: cleaning.deleteCleaningReport,

  // Packaging Reports
  createPackagingReport: packaging.createPackagingReport,
  listPackagingReports: packaging.listPackagingReports,
  updatePackagingReport: packaging.updatePackagingReport,
  deletePackagingReport: packaging.deletePackagingReport,

  // Production Reports
  createProductionReport: production.createProductionReport,
  listProductionReports: production.listProductionReports,
  updateProductionReport: production.updateProductionReport,
  deleteProductionReport: production.deleteProductionReport,

  // Weight Reports
  createWeightReport: weight.createWeightReport,
  saveWeightDraft: weight.saveWeightDraft,
  getPendingWeightReport: weight.getPendingWeightReport,
  listWeightReports: weight.listWeightReports,
  updateWeightReport: weight.updateWeightReport,
  deleteWeightReport: weight.deleteWeightReport,

  // Cleaning Plant Reports
  createCleaningPlantReport: cleaningPlant.createCleaningPlantReport,
  listCleaningPlantReports: cleaningPlant.listCleaningPlantReports,
  updateCleaningPlantReport: cleaningPlant.updateCleaningPlantReport,
  deleteCleaningPlantReport: cleaningPlant.deleteCleaningPlantReport,

  // Control Expedition Reports
  createControlExpeditionReport: controlExpedition.createControlExpeditionReport,
  listControlExpeditionReports: controlExpedition.listControlExpeditionReports,
  updateControlExpeditionReport: controlExpedition.updateControlExpeditionReport,
  deleteControlExpeditionReport: controlExpedition.deleteControlExpeditionReport,

  // Customer Satisfaction Reports
  createCustomerSatisfactionForm: customerSatisfaction.createCustomerSatisfactionForm,
  listCustomerSatisfactionForms: customerSatisfaction.listCustomerSatisfactionForms,
  updateCustomerSatisfactionForm: customerSatisfaction.updateCustomerSatisfactionForm,
  deleteCustomerSatisfactionForm: customerSatisfaction.deleteCustomerSatisfactionForm,

  // Initial Reports
  createInitialReport: initialReport.createInitialReport,
  listInitialReports: initialReport.listInitialReports,
  updateInitialReport: initialReport.updateInitialReport,
  deleteInitialReport: initialReport.deleteInitialReport,

  // Tool Registration Reports
  createToolReport: toolRegistration.createToolReport,
  listToolReports: toolRegistration.listToolReports,
  updateToolReport: toolRegistration.updateToolReport,
  deleteToolReport: toolRegistration.deleteToolReport,

  // Revision Reports
  createInformeRevision: revision.createInformeRevision,
  listInformesRevision: revision.listInformesRevision,
  updateInformeRevision: revision.updateInformeRevision,
  deleteInformeRevision: revision.deleteInformeRevision,
  getInformeRevision: revision.getInformeRevision,
};

