import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

/**
 * Export routes in PDF or XLSX format.
 * @param {Array} routes - Array of route objects.
 * @param {Object} options
 * @param {string} options.format - 'pdf' or 'xlsx'
 * @param {string} [options.filterLabel] - Label used in titles for filtered exports.
 */
export async function exportRoutes(routes, options = {}) {
  const { format = 'xlsx', filterLabel = '' } = options;

  if (format === 'pdf') {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const left = 14;
    const lineH = 6;
    let y = 20;

    // Batch title on first page
    if (filterLabel) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      const title = `Route Reports: ${filterLabel}`;
      const textW = doc.getTextWidth(title);
      doc.text(title, (pageW - textW) / 2, y);
      y += lineH * 2;
    }

    routes.forEach((rt, idx) => {
      if (idx > 0) {
        doc.addPage();
        y = 20;
      }

      // Per-route header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Route Report: ${rt.identifier}`, left, y);
      y += lineH * 2;

      // Details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      const details = [
        ['Created By', rt.created_by_email],
        ['Date', rt.date],
        ['Truck', rt.truck_plate],
        ['Distance', `${rt.distance_km.toLocaleString()} km`],
        ['Duration', rt.duration],
        ['€ / km', `€${rt.euro_per_km.toFixed(2)}`],
        ['Toll', `€${rt.toll_cost.toFixed(2)}`],
        ['Route Cost', `€${(rt.distance_km * rt.euro_per_km).toFixed(2)}`],
      ];
      if (rt.pricePerDay != null) {
        const [h, m] = rt.duration.split(' ').map(s => parseInt(s, 10));
        const totalHrs = (h || 0) + ((m || 0) / 60);
        const days = Math.ceil(totalHrs / 24);
        details.push(
          ['Price / Day', `€${rt.pricePerDay.toFixed(2)}`],
          ['Days', String(days)],
          ['Extra Cost', `€${(days * rt.pricePerDay).toFixed(2)}`]
        );
      }
      details.forEach(([label, val]) => {
        y += lineH;
        doc.text(`${label}: ${val}`, left, y);
      });

      // Addresses table
      const rows = rt.addresses.map((a, i) => [i + 1, a.label]);
      autoTable(doc, {
        head: [['#', 'Address']],
        body: rows,
        startY: y + lineH,
        margin: { left, right: left },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        didParseCell: data => {
          if (data.row.section === 'body' && data.column.index === 1) {
            data.cell.text = [data.cell.raw];
          }
        },
      });
    });

    // Save PDF
    doc.save(filterLabel
      ? `routes-${filterLabel}.pdf`
      : `routes.pdf`
    );
  } else {
    // XLSX export
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Routes');

    // Header row
    const headers = [
      'Identifier', 'Created By', 'Date', 'Truck',
      'Distance (km)', 'Duration', '€ / km', 'Toll', 'Route Cost', 'Total Cost'
    ];
    sheet.addRow(headers);

    // Data rows
    routes.forEach(rt => {
      const totalCost =
        (rt.distance_km * rt.euro_per_km) +
        (rt.pricePerDay != null
          ? Math.ceil(((parseInt(rt.duration) || 0) + ((parseInt(rt.duration.split(' ')[1]) || 0)/60)) / 24) * rt.pricePerDay
          : 0);
      sheet.addRow([
        rt.identifier,
        rt.created_by_email,
        rt.date,
        rt.truck_plate,
        rt.distance_km,
        rt.duration,
        rt.euro_per_km,
        rt.toll_cost,
        (rt.distance_km * rt.euro_per_km),
        totalCost
      ]);
    });

    // Auto-width columns
    sheet.columns.forEach(col => {
      let max = 10;
      col.eachCell({ includeEmpty: false }, cell => {
        max = Math.max(max, String(cell.value).length + 2);
      });
      col.width = max;
    });

    // Write and trigger download
    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filterLabel
      ? `routes-${filterLabel}.xlsx`
      : `routes.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
