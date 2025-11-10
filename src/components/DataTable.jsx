import { useState } from 'react'

const DataTable = ({ data, columns, onRowClick, expandable = false }) => {
  const [expandedRows, setExpandedRows] = useState(new Set())

  const toggleRow = (index) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  const parseSKUInfo = (skuInfo) => {
    if (!skuInfo) return []
    return skuInfo.split(' // ').map(item => {
      const [name, qty] = item.split(' $ ')
      return { name: name?.trim(), qty: qty?.trim() || '0' }
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              {expandable && <th className="px-2 py-2 text-xs w-8"></th>}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (expandable ? 1 : 0)} className="px-2 py-8 text-center text-xs text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <>
                  <tr
                    key={rowIdx}
                    onClick={() => {
                      if (expandable) toggleRow(rowIdx)
                      if (onRowClick) onRowClick(row)
                    }}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      expandedRows.has(rowIdx) ? 'bg-blue-50' : ''
                    }`}
                  >
                    {expandable && (
                      <td className="px-2 py-2 text-xs text-center">
                        <span className="text-blue-600">
                          {expandedRows.has(rowIdx) ? '▲' : '▼'}
                        </span>
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                      </td>
                    ))}
                  </tr>
                  {expandable && expandedRows.has(rowIdx) && row.sku_info && (
                    <tr className="bg-blue-50">
                      <td colSpan={columns.length + (expandable ? 1 : 0)} className="px-3 py-3">
                        <div className="bg-white rounded border border-gray-200 divide-y divide-gray-200">
                          {parseSKUInfo(row.sku_info).map((item, idx) => (
                            <div key={idx} className="px-3 py-2 text-xs text-gray-800">
                              <p className="font-medium break-words" title={item.name}>
                                {item.name}
                              </p>
                              <p className="text-gray-600 mt-1">Quantity: <span className="text-gray-900 font-semibold">{item.qty}</span></p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable


