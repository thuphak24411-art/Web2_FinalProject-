const STATUS_ALIASES = {
  'cho xac nhan': 'Chờ xác nhận',
  'cho lua chon cua nguoi dung': 'Chờ lựa chọn của người dùng',
  'cho admin cap nhat trang thai': 'Chờ admin cập nhật trạng thái',
  'da chon ban lai': 'Đã chọn bán lại',
  'da huy': 'Đã hủy',
  'dang sua chua': 'Đang sửa chữa',
  'da hoan thanh': 'Đã hoàn thành',
  'da giao hang': 'Đã giao hàng'
};

function normalizeRepairStatus(status) {
  const value = String(status || '').trim();
  const key = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return STATUS_ALIASES[key] || value;
}

function normalizeRepairOrderStatus(order) {
  return normalizeRepairStatus(order.status);
}

module.exports = { normalizeRepairOrderStatus, normalizeRepairStatus };
