/**
 * Format number to Indian Currency format (no decimals)
 * Example: 1234567 -> ₹12,34,567
 */
export const formatIndianCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0'
  
  const num = Math.round(parseFloat(amount)) // Remove decimals
  const numStr = num.toString()
  const isNegative = num < 0
  const absNumStr = isNegative ? numStr.substring(1) : numStr
  
  // Indian numbering system: last 3 digits, then groups of 2
  let result = ''
  let count = 0
  
  for (let i = absNumStr.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      result = ',' + result
    }
    result = absNumStr[i] + result
    count++
  }
  
  return (isNegative ? '-' : '') + '₹' + result
}


