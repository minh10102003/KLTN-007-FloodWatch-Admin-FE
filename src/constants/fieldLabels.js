/** Nhãn tiếng Việt cho tham số research — không render key snake_case ra UI. */
export const FIELD_LABELS = {
  crowd_hours: 'Khoảng thời gian dữ liệu đám đông (giờ)',
  sensor_hours: 'Khoảng thời gian dữ liệu cảm biến (giờ)',
  report_hours: 'Khoảng thời gian báo cáo (giờ)',
  no_sensor_radius_m: 'Bán kính vùng không có cảm biến (m)',
  min_reports: 'Số báo cáo tối thiểu',
  min_lng: 'Kinh độ tây (tùy chọn)',
  max_lng: 'Kinh độ đông (tùy chọn)',
  min_lat: 'Vĩ độ nam (tùy chọn)',
  max_lat: 'Vĩ độ bắc (tùy chọn)',
};

export function labelForField(key) {
  return FIELD_LABELS[key] || key;
}
