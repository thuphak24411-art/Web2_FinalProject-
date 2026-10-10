const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRepairOrderStatus } = require('./repair-status');

test('legacy repair selection is shown as not yet repaired', () => {
  assert.equal(normalizeRepairOrderStatus({
    status: 'Đang sửa chữa',
    userChoice: { option: 'repair', chosenAt: '2026-10-10T10:00:00.000Z' }
  }), 'Chưa sửa chữa');
});

test('manual admin status update after user choice is preserved', () => {
  assert.equal(normalizeRepairOrderStatus({
    status: 'Đang sửa chữa',
    statusUpdatedAt: '2026-10-10T11:00:00.000Z',
    userChoice: { option: 'repair', chosenAt: '2026-10-10T10:00:00.000Z' }
  }), 'Đang sửa chữa');
});

test('statuses unrelated to a legacy choice are left unchanged', () => {
  assert.equal(normalizeRepairOrderStatus({
    status: 'Chờ lựa chọn của người dùng',
    userChoice: { option: 'repair', chosenAt: '2026-10-10T10:00:00.000Z' }
  }), 'Chờ lựa chọn của người dùng');
});

test('a repair choice remains in the admin update queue', () => {
  assert.equal(normalizeRepairOrderStatus({
    status: 'Chờ admin cập nhật trạng thái',
    userChoice: { option: 'repair', chosenAt: '2026-10-10T10:00:00.000Z' }
  }), 'Chờ admin cập nhật trạng thái');
});

test('a completed resale listing is shown as selling rather than a repair status', () => {
  assert.equal(normalizeRepairOrderStatus({
    status: 'Đã chọn phương án',
    saleListingID: 'RS123',
    userChoice: { option: 'resell', chosenAt: '2026-10-10T10:00:00.000Z' }
  }), 'Đang bán');
});

test('a legacy resale choice without a marketplace listing is not shown as an active listing', () => {
  assert.equal(normalizeRepairOrderStatus({
    status: 'Đã chọn phương án',
    userChoice: { option: 'resell', chosenAt: '2026-10-10T10:00:00.000Z' }
  }), 'Đã chọn bán lại');
});
