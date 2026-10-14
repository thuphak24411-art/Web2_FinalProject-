function normalizeRepairOrderStatus(order) {
  if (order.userChoice?.option === 'resell') {
    return order.saleListingID || order.status === 'Đang bán'
      ? 'Đang bán'
      : 'Đã chọn bán lại';
  }

  if (order.userChoice?.option !== 'repair') {
    return order.status;
  }

  const chosenStatus = 'Chưa sửa chữa';
  const isLegacyChoiceStatus = order.status === 'Đang sửa chữa';
  if (!isLegacyChoiceStatus) return order.status;

  const statusWasUpdatedAfterChoice =
    Date.parse(order.statusUpdatedAt || '') > Date.parse(order.userChoice.chosenAt || '');
  return statusWasUpdatedAfterChoice ? order.status : chosenStatus;
}

module.exports = { normalizeRepairOrderStatus };
