# TODO: Implement Revision Report Endpoints

## Task Overview
Create all backend endpoints for revision reports to make them functional and manageable from admin panel.

## Endpoints to Implement

### 1. createInformeRevision
- Create new revision report with:
  - All checklist sections (verificacion_limpieza, exteriores, zona_recepcion_mercancias, etc.)
  - Points status (C=Conforme, NC=No Conforme, NA=No Aplica)
  - Comments for each point
  - Employee signature (firmaImagenBase64)
  - Responsible signature (firmaResponsable)
  - Save signatures to Dropbox
  - Store record in MongoDB

### 2. listInformesRevision
- List all revision reports with pagination
- Support filtering by date range
- Return: id, fecha, hora, employee_id, areas, conformity status

### 3. getInformeRevision
- Get single revision report by ID
- Include: all checklist data, signatures URLs, comments

### 4. updateInformeRevision
- Update existing revision report
- Handle signature updates (re-upload to Dropbox if changed)

### 5. deleteInformeRevision
- Delete revision report by ID
- Also delete associated files from Dropbox

 signature### 6. exportInformesRevisionExcel
- Export all/specified revision reports to Excel
- Columns: fecha, hora, employee_id, areas, puntos_revisar, conformidad, comentarios, firma_empleado_url, firma_responsable_url

## Implementation Location
Add all endpoints to: `moval/functions/index.js`

## Status
- [ ] Add all 6 endpoints to backend
- [ ] Test creation with sample data
- [ ] Verify signatures appear in Dropbox
- [ ] Verify admin panel can view/edit/delete/export
