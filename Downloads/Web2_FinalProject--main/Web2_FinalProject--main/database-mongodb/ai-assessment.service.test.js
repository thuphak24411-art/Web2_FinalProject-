const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildGeminiPrompt,
  buildMarketPriceReferences,
  createAssessmentFingerprint,
  fallbackAssessment,
  parseGeminiResponse,
  parsePriceAmount,
  requestAssessment
} = require('./ai-assessment.service');

const repair = {
  repairOrderID: 'RP1',
  deviceType: 'Điện thoại',
  issueDescription: 'Không nhận sạc',
  assessment: {
    brand: 'Apple',
    usagePeriod: '2–4 năm',
    appearance: { overall: 'Tốt', screen: 'Nguyên vẹn', casing: 'Trầy xước nhẹ', waterDamage: 'Không' },
    functionality: { startup: 'Bình thường', mainFunction: 'Hoạt động bình thường', ports: 'Có lỗi', deviceChecks: {}, issues: ['Không nhận sạc'] },
    battery: { condition: 'Pin yếu', repairHistory: 'Không rõ', replacedParts: [] }
  }
};

test('prompt yêu cầu Gemini chỉ đánh giá hai hướng sửa chữa và bán lại', () => {
  const prompt = buildGeminiPrompt(repair);
  assert.match(prompt, /repair/);
  assert.match(prompt, /resell/);
  assert.doesNotMatch(prompt, /"recycle"\s*:/i);
  assert.match(prompt, /DUY NHẤT một JSON hợp lệ/);
});

test('prompt dùng giá niêm yết sản phẩm đang bán khi khách không nhập giá', () => {
  const prompt = buildGeminiPrompt({
    ...repair,
    userEstimatedPriceVnd: null,
    marketPriceReferences: [{
      productID: 'DV1',
      title: 'Apple iPhone 12 128GB',
      listedPriceVnd: 5200000,
      condition: 'Đã qua sử dụng',
      status: 'Còn hàng'
    }]
  });
  assert.match(prompt, /GIÁ NIÊM YẾT THAM KHẢO/);
  assert.match(prompt, /"listedPriceVnd":5200000/);
  assert.match(prompt, /giá niêm yết các tin đang bán/);
  assert.match(prompt, /hai giá phải được ước tính riêng/i);
});

test('giá không hợp lệ hoặc rỗng không bị hiểu nhầm thành 0 đồng', () => {
  assert.equal(parsePriceAmount(null), null);
  assert.equal(parsePriceAmount(''), null);
  assert.equal(parsePriceAmount(-100), null);
  assert.equal(parsePriceAmount(0), 0);
  assert.equal(parsePriceAmount('5200000'), 5200000);
});

test('giá tham chiếu chỉ lấy model phù hợp còn bán, có tồn kho và cùng loại thiết bị', () => {
  const references = buildMarketPriceReferences([
    {
      CateName: 'Điện thoại',
      Products: [
        { id: 'available', title: 'Apple iPhone 12 128GB', fromPrice: '5.200.000₫', condition: 'Đã qua sử dụng', Status: 'Còn hàng', quantity: 2 },
        { id: 'sold', title: 'Apple iPhone 12 256GB', fromPrice: '6.000.000₫', Status: 'Đã bán', quantity: 0 },
        { id: 'empty', title: 'Apple iPhone 12 mini', fromPrice: '3.000.000₫', Status: 'Còn hàng', quantity: 0 },
        { id: 'other-brand', title: 'Samsung Galaxy S22', fromPrice: '4.000.000₫', Status: 'Còn hàng', quantity: 3 }
      ]
    },
    {
      CateName: 'Laptop',
      Products: [
        { id: 'other-type', title: 'Apple iPhone 12 laptop edition', fromPrice: '9.000.000₫', Status: 'Còn hàng', quantity: 1 }
      ]
    }
  ], {
    deviceType: 'Điện thoại',
    deviceName: 'iPhone 12 128GB',
    assessment: { brand: 'Apple' }
  });
  assert.deepEqual(references.map(item => item.productID), ['available']);
  assert.equal(references[0].listedPriceVnd, 5200000);
});

test('parser giữ null khi Gemini không đủ căn cứ định giá', () => {
  const result = parseGeminiResponse(JSON.stringify({
    repair: { title: 'Sửa chữa' },
    resell: { title: 'Bán lại' },
    recycle: { title: 'Kết quả cũ phải được bỏ qua' },
    estimatedPrice: { amountVnd: null, display: 'Chưa đủ dữ liệu định giá' },
    estimatedPrices: {
      repair: { amountVnd: null, display: 'Chưa đủ dữ liệu định giá' },
      resell: { amountVnd: null, display: 'Chưa đủ dữ liệu định giá' }
    }
  }), {});
  assert.equal(result.estimatedPrices.repair.amountVnd, null);
  assert.equal(result.estimatedPrices.resell.amountVnd, null);
  assert.deepEqual(Object.keys(result.recommendations).sort(), ['repair', 'resell']);
  assert.deepEqual(Object.keys(result.estimatedPrices).sort(), ['repair', 'resell']);
});

test('đánh giá dự phòng cũng chỉ trả hai phương án', () => {
  const result = fallbackAssessment({
    repairOrderID: 'RP1',
    userID: 'U1',
    deviceType: 'Điện thoại',
    fingerprint: 'fingerprint'
  });
  assert.deepEqual(Object.keys(result.recommendations).sort(), ['repair', 'resell']);
  assert.deepEqual(Object.keys(result.estimatedPrices).sort(), ['repair', 'resell']);
});

test('fingerprint ổn định với thứ tự dữ liệu khác nhau', () => {
  const reordered = { ...repair, assessment: { ...repair.assessment, functionality: { ...repair.assessment.functionality, issues: ['Không nhận sạc'] } } };
  assert.equal(createAssessmentFingerprint(repair), createAssessmentFingerprint(reordered));
});

test('fingerprint không thay đổi khi chỉ thay ảnh minh họa', () => {
  const withDifferentPhoto = {
    ...repair,
    assessment: {
      ...repair.assessment,
      images: [{ name: 'another-photo.png', type: 'image/png', size: 10, area: 'Mặt trước' }]
    }
  };
  assert.equal(createAssessmentFingerprint(repair), createAssessmentFingerprint(withDifferentPhoto));
});

test('requestAssessment gọi Gemini bằng API key và chỉ trả hai hướng', async () => {
  let callCount = 0;
  const result = await requestAssessment(repair, {
    apiKey: 'test-key',
    userID: 'U1',
    fetchImplementation: async (url, init) => {
      callCount++;
      assert.match(url, /key=test-key/);
      assert.equal(init.method, 'POST');
      return {
        ok: true,
        async json() {
          return { candidates: [{ content: { parts: [{ text: JSON.stringify({
            repair: { title: 'Sửa chữa', recommendation: 'Thay cổng sạc', nextStep: 'Kiểm tra cổng', confidence: 'cao' },
            resell: { title: 'Bán lại', recommendation: 'Có thể bán sau sửa', nextStep: 'Công khai lỗi', confidence: 'trung bình' },
            summary: 'Ưu tiên sửa chữa',
            estimatedPrice: {
              amountVnd: 850000,
              currency: 'VND',
              display: '850.000 VND',
              rationale: 'Thay cổng sạc và kiểm tra pin'
            }
          }) }] } }] };
        }
      };
    }
  });
  assert.equal(callCount, 1);
  assert.equal(result.source, 'gemini');
  assert.deepEqual(Object.keys(result.recommendations).sort(), ['repair', 'resell']);
  assert.deepEqual(Object.keys(result.estimatedPrices).sort(), ['repair', 'resell']);
  assert.equal(result.estimatedPrice, '850.000 VND');
  assert.equal(result.estimatedPriceDetails.amountVnd, 850000);
});

test('requestAssessment đổi model khi model chính bị quá tải', async () => {
  const calls = [];
  const validAssessment = {
    repair: { title: 'Sửa chữa', recommendation: 'Kiểm tra', nextStep: 'Mang tới kỹ thuật viên', confidence: 'trung bình' },
    resell: { title: 'Bán lại', recommendation: 'Có thể bán', nextStep: 'Đăng bán', confidence: 'thấp' },
    summary: 'Cần kiểm tra thêm',
    estimatedPrice: { amountVnd: 100000, currency: 'VND', display: '100.000 VND', rationale: 'Ước tính' },
    estimatedPrices: {
      repair: { amountVnd: 100000, currency: 'VND', display: '100.000 VND', rationale: 'Ước tính' },
      resell: { amountVnd: 200000, currency: 'VND', display: '200.000 VND', rationale: 'Ước tính' }
    }
  };
  const result = await requestAssessment(repair, {
    apiKey: 'test-key',
    model: 'primary-model',
    fallbackModels: ['backup-model'],
    retriesPerModel: 2,
    retryDelayMs: 0,
    fetchImplementation: async url => {
      calls.push(url);
      if (calls.length <= 2) {
        return { ok: false, status: 503, async text() { return 'temporarily unavailable'; } };
      }
      return {
        ok: true,
        async json() {
          return { candidates: [{ content: { parts: [{ text: JSON.stringify(validAssessment) }] } }] };
        }
      };
    }
  });
  assert.equal(calls.length, 3);
  assert.match(calls[0], /primary-model/);
  assert.match(calls[1], /primary-model/);
  assert.match(calls[2], /backup-model/);
  assert.equal(result.source, 'gemini');
  assert.equal(result.model, 'backup-model');
});
