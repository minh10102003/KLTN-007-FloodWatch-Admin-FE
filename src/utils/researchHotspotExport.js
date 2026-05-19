import ExcelJS from 'exceljs';
import { formatAdminDateTime } from './formatDateTime';

const FONT = 'Times New Roman';

const TEMPLATES = {
  vi: {
    sheetName: 'Diem nong D2',
    title: 'BÁO CÁO ĐIỂM NÓNG KHI THIẾU CẢM BIẾN',
    subtitle: 'FloodSight Admin — Phân tích nghiên cứu (D2 · Cold-start hotspots)',
    generatedAt: 'Ngày xuất',
    paramsReportHours: 'Khoảng báo cáo (giờ)',
    paramsSensorHours: 'Cảm biến có log (giờ)',
    paramsRadius: 'Bán kính không cảm biến (m)',
    paramsMinReports: 'Số báo cáo tối thiểu / cụm',
    d1Section: 'Tóm tắt đánh giá D1 (cùng bộ lọc thời gian)',
    d1Samples: 'Số mẫu',
    d1MaeBaseline: 'MAE — chỉ báo cáo (cm)',
    d1MaeFused: 'MAE — kết hợp (cm)',
    d1RmseBaseline: 'RMSE — chỉ báo cáo (cm)',
    d1RmseFused: 'RMSE — kết hợp (cm)',
    priority: { high: 'Cao', medium: 'Trung bình', low: 'Thấp' },
    columns: [
      'STT',
      'Kinh độ (cụm)',
      'Vĩ độ (cụm)',
      'Số báo cáo',
      'Trung bình (cm)',
      'Cao nhất (cm)',
      'Cảm biến gần nhất (m)',
      'Báo cáo mới nhất',
      'Điểm ưu tiên',
      'Mức ưu tiên',
    ],
  },
  en: {
    sheetName: 'Cold-start D2',
    title: 'COLD-START HOTSPOTS REPORT (SENSOR GAP ANALYSIS)',
    subtitle: 'FloodSight Admin — Research analytics (Part D2)',
    generatedAt: 'Generated at',
    paramsReportHours: 'Report window (hours)',
    paramsSensorHours: 'Sensors with logs (hours)',
    paramsRadius: 'No-sensor radius (m)',
    paramsMinReports: 'Minimum reports per cluster',
    d1Section: 'D1 evaluation summary (same time filters)',
    d1Samples: 'Sample count',
    d1MaeBaseline: 'MAE — reports only (cm)',
    d1MaeFused: 'MAE — fused (cm)',
    d1RmseBaseline: 'RMSE — reports only (cm)',
    d1RmseFused: 'RMSE — fused (cm)',
    priority: { high: 'High', medium: 'Medium', low: 'Low' },
    columns: [
      'No.',
      'Longitude (cluster)',
      'Latitude (cluster)',
      'Report count',
      'Average (cm)',
      'Maximum (cm)',
      'Nearest sensor (m)',
      'Latest report',
      'Priority score',
      'Priority level',
    ],
  },
};

function cellFont(bold = false, size = 11) {
  return { name: FONT, size, bold };
}

function styleTitleRow(row) {
  row.font = cellFont(true, 14);
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height = 28;
}

function styleHeaderRow(row) {
  row.font = cellFont(true, 11);
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8E8E8' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 22;
}

function styleDataRow(row) {
  row.font = cellFont(false, 11);
  row.alignment = { vertical: 'middle' };
}

function styleMetaRow(row) {
  row.font = cellFont(false, 11);
}

/**
 * @param {object} opts
 * @param {Array} opts.hotspots — rows with BE fields + priority_score, priority_level_key
 * @param {object} [opts.meta] — hotspots API meta
 * @param {object} [opts.evaluation] — D1 data
 * @param {object} [opts.filters] — applied filters from UI
 * @param {'vi'|'en'} [opts.locale]
 */
export async function downloadResearchHotspotsWorkbook({
  hotspots,
  meta,
  evaluation,
  filters = {},
  locale = 'vi',
}) {
  const lang = locale === 'en' ? 'en' : 'vi';
  const tpl = TEMPLATES[lang];
  const colCount = tpl.columns.length;
  const lastCol = String.fromCharCode(64 + colCount);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FloodSight Admin';
  const ws = wb.addWorksheet(tpl.sheetName, {
    views: [{ state: 'frozen', ySplit: 0 }],
  });

  let r = 1;
  ws.mergeCells(`A${r}:${lastCol}${r}`);
  ws.getCell(`A${r}`).value = tpl.title;
  styleTitleRow(ws.getRow(r));
  r += 1;

  ws.mergeCells(`A${r}:${lastCol}${r}`);
  ws.getCell(`A${r}`).value = tpl.subtitle;
  styleMetaRow(ws.getRow(r));
  ws.getRow(r).font = cellFont(false, 11);
  r += 1;

  const generated = formatAdminDateTime(new Date().toISOString(), lang);
  ws.getCell(`A${r}`).value = `${tpl.generatedAt}:`;
  ws.getCell(`B${r}`).value = generated;
  styleMetaRow(ws.getRow(r));
  r += 1;

  const reportH = meta?.report_hours ?? filters.report_hours ?? '—';
  const sensorH = meta?.sensor_hours ?? filters.sensor_hours ?? '—';
  const radiusM = meta?.no_sensor_radius_m ?? filters.no_sensor_radius_m ?? '—';
  const minRep = meta?.min_reports_per_hotspot ?? filters.min_reports ?? '—';

  ws.getCell(`A${r}`).value = tpl.paramsReportHours;
  ws.getCell(`B${r}`).value = reportH;
  ws.getCell(`C${r}`).value = tpl.paramsSensorHours;
  ws.getCell(`D${r}`).value = sensorH;
  styleMetaRow(ws.getRow(r));
  r += 1;

  ws.getCell(`A${r}`).value = tpl.paramsRadius;
  ws.getCell(`B${r}`).value = radiusM;
  ws.getCell(`C${r}`).value = tpl.paramsMinReports;
  ws.getCell(`D${r}`).value = minRep;
  styleMetaRow(ws.getRow(r));
  r += 1;

  if (evaluation) {
    r += 1;
    ws.mergeCells(`A${r}:${lastCol}${r}`);
    ws.getCell(`A${r}`).value = tpl.d1Section;
    ws.getRow(r).font = cellFont(true, 11);
    r += 1;

    ws.getCell(`A${r}`).value = tpl.d1Samples;
    ws.getCell(`B${r}`).value = evaluation.sample_count ?? '—';
    styleMetaRow(ws.getRow(r));
    r += 1;

    ws.getCell(`A${r}`).value = tpl.d1MaeBaseline;
    ws.getCell(`B${r}`).value = evaluation.baseline_crowd_only?.mae_cm ?? '—';
    ws.getCell(`C${r}`).value = tpl.d1MaeFused;
    ws.getCell(`D${r}`).value = evaluation.fused_model?.mae_cm ?? '—';
    styleMetaRow(ws.getRow(r));
    r += 1;

    ws.getCell(`A${r}`).value = tpl.d1RmseBaseline;
    ws.getCell(`B${r}`).value = evaluation.baseline_crowd_only?.rmse_cm ?? '—';
    ws.getCell(`C${r}`).value = tpl.d1RmseFused;
    ws.getCell(`D${r}`).value = evaluation.fused_model?.rmse_cm ?? '—';
    styleMetaRow(ws.getRow(r));
    r += 1;
  }

  r += 1;
  const headerRowNum = r;
  const headerRow = ws.getRow(r);
  tpl.columns.forEach((label, i) => {
    headerRow.getCell(i + 1).value = label;
  });
  styleHeaderRow(headerRow);
  r += 1;

  hotspots.forEach((h, idx) => {
    const levelKey = h.priority_level_key || 'low';
    const row = ws.getRow(r);
    row.values = [
      idx + 1,
      h.hotspot_lng != null ? Number(h.hotspot_lng) : '',
      h.hotspot_lat != null ? Number(h.hotspot_lat) : '',
      h.report_count ?? 0,
      h.avg_crowd_cm != null ? Number(h.avg_crowd_cm) : '',
      h.max_crowd_cm != null ? Number(h.max_crowd_cm) : '',
      h.nearest_sensor_min_dist_m != null ? Number(h.nearest_sensor_min_dist_m) : '',
      h.latest_report_at ? formatAdminDateTime(h.latest_report_at, lang) : '',
      h.priority_score != null ? Number(Number(h.priority_score).toFixed(2)) : '',
      tpl.priority[levelKey] ?? levelKey,
    ];
    styleDataRow(row);
    r += 1;
  });

  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
  ];

  ws.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: colCount },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `floodsight-cold-start-hotspots-${lang}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
