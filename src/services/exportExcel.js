import * as XLSX from 'xlsx'

/**
 * Export data to Excel file
 */
export const exportToExcel = (data, filename = 'export.xlsx') => {
  // Prepare data for export
  const exportData = data.map((row) => ({
    'Timestamp': row.timestamp || '',
    'Submission ID': row.submission_id || '',
    'Employee Email': row.employee_email || '',
    'Total Books': row.total_books || 0,
    'Sample Status': row.sample_status || '',
    'ZM Approval': row.zm_approval || '',
    'Dispatched Date': row.dispatched_date || '',
    'Tracking ID': row.tracking_id || '',
    'Tracking Link': row.tracking_link || '',
    'Delivered Date': row.delivered_date || '',
    'SKU Info': row.sku_info || '',
  }))

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Sample Requests')

  // Write file
  XLSX.writeFile(wb, filename)
}


