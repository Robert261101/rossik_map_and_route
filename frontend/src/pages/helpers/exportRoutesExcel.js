// src/helpers/exportRoutesExcel.js

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Turn an array of route objects into a well-formatted .xlsx and trigger download.
 * @param {Array} routes       – Array of route objects to export
 * @param {string} filterLabel – The user-input filter string (used as fallback)
 */
export function exportRoutesExcel(routes, filterLabel) {
  // 0) If all routes share the same truck_plate, use that for the filename
  const plates = Array.from(new Set(routes.map(rt => rt.truck_plate)));
  let fileLabel = filterLabel;
  if (plates.length === 1) {
    // sanitize: replace spaces with hyphens
    fileLabel = plates[0].replace(/\s+/g, '-');
  }

  // 1) Normalize & format your data rows
  const data = routes.map(rt => {
    const totalHrs =
      (parseInt(rt.duration, 10) || 0) +
      ((parseInt(rt.duration.split(' ')[1], 10) || 0) / 60);
    const days = Math.ceil(totalHrs / 24);
    const extraCost = rt.pricePerDay != null ? days * rt.pricePerDay : '';

    return {
      Identifier:    rt.identifier,
      'Created By':  rt.created_by_email,
      Date:          rt.date,
      Truck:         rt.truck_plate,
      Distance:      Number(rt.distance_km).toFixed(2),
      Duration:      rt.duration,
      '€ / km':      Number(rt.euro_per_km).toFixed(2),
      Toll:          Number(rt.toll_cost).toFixed(2),
      'Route Cost':  Number(rt.total_cost).toFixed(2),
      'Price / Day': rt.pricePerDay != null ? Number(rt.pricePerDay).toFixed(2) : '',
      Days:          rt.pricePerDay != null ? days : '',
      'Extra Cost':  extraCost !== '' ? extraCost.toFixed(2) : '',
      Addresses:     rt.addresses.map(a => a.label).join(' → ')
    };
  });

  // 2) Create worksheet & workbook
  const ws = XLSX.utils.json_to_sheet(data, { header: Object.keys(data[0]) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Routes');

  // 3) Auto-fit each column to its content length
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => (row[key] || '').toString().length)
    );
    return { wch: maxLen + 2 };
  });
  ws['!cols'] = colWidths;

  // 4) Generate binary & trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([wbout], { type: 'application/octet-stream' }),
    `routes-filtered-${fileLabel}.xlsx`
  );
}
