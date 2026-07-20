import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// Helpers
function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n || 0)
}

function numberToVietnameseWords(amount) {
  if (!amount || amount === 0) return 'Không đồng'
  const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ']
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

  function readGroup3(n, showZeroHundred) {
    const hundred = Math.floor(n / 100)
    const ten = Math.floor((n % 100) / 10)
    const unit = n % 10
    let res = ''
    if (hundred > 0 || showZeroHundred) res += digits[hundred] + ' trăm '
    if (ten > 0) {
      if (ten === 1) res += 'mười '
      else res += digits[ten] + ' mươi '
    } else if (hundred > 0 && unit > 0) {
      res += 'lẻ '
    }
    if (unit > 0) {
      if (unit === 1 && ten > 1) res += 'mốt'
      else if (unit === 5 && ten > 0) res += 'lăm'
      else res += digits[unit]
    }
    return res.trim()
  }

  let strAmount = Math.floor(amount).toString()
  let groups = []
  while (strAmount.length > 0) {
    groups.push(strAmount.substring(Math.max(0, strAmount.length - 3)))
    strAmount = strAmount.substring(0, Math.max(0, strAmount.length - 3))
  }

  let resultStr = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = parseInt(groups[i], 10)
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1
      resultStr += readGroup3(groupVal, showZeroHundred) + units[i] + ' '
    }
  }
  resultStr = resultStr.trim()
  if (!resultStr) return 'Không đồng'
  return resultStr.charAt(0).toUpperCase() + resultStr.slice(1) + ' đồng chẵn.'
}

export async function exportInvoiceToPdf(order, action = 'save') {
  // 1. Tạo container ẩn
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '148mm'
  container.style.minHeight = '210mm'
  container.style.fontFamily = '"Times New Roman", Times, serif'
  container.style.color = '#000'
  container.style.backgroundColor = '#ffffff'
  container.style.padding = '1.5rem'
  container.style.boxSizing = 'border-box'

  const cartProducts = order.items || []
  const subtotal = order.totalAmount || 0
  const discountAmount = order.discountAmount || 0
  const vat = order.vatAmount || 0
  const total = order.finalPayment || 0
  const isPaid = order.paymentStatus === 'Paid'
  const paymentMethod = (order.paymentMethod || '').toLowerCase()
  const orderCode = order.orderCode || ''
  
  let discountRate = 0
  if (subtotal > 0 && discountAmount > 0) {
      discountRate = discountAmount / subtotal
  }

  const minRows = 10
  const blankRowsCount = Math.max(0, minRows - cartProducts.length)
  const blankRows = Array.from({ length: blankRowsCount })

  const d = new Date(order.createdAt || Date.now())
  const orderDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  const orderDateFull = `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`

  let itemsHtml = cartProducts.map((item, idx) => `
    <tr>
      <td style="border: 1px solid black; padding: 3px 6px; font-weight: bold; vertical-align: middle;">
        ${item.productName || ''}
      </td>
      <td style="border: 1px solid black; padding: 3px 6px; text-align: center; vertical-align: middle;">Cuộn</td>
      <td style="border: 1px solid black; padding: 3px 6px; text-align: center; vertical-align: middle;">${item.quantity}</td>
      <td style="border: 1px solid black; padding: 3px 6px; text-align: right; vertical-align: middle;">
        ${formatPrice(item.priceSnapshot || 0)}
      </td>
      <td style="border: 1px solid black; padding: 3px 6px; text-align: right; font-weight: bold; vertical-align: middle;">
        ${formatPrice((item.priceSnapshot || 0) * item.quantity)}
      </td>
    </tr>
  `).join('')

  let blankRowsHtml = blankRows.map(() => `
    <tr style="height: 20px;">
      <td style="border: 1px solid black;">&nbsp;</td>
      <td style="border: 1px solid black;">&nbsp;</td>
      <td style="border: 1px solid black;">&nbsp;</td>
      <td style="border: 1px solid black;">&nbsp;</td>
      <td style="border: 1px solid black;">&nbsp;</td>
    </tr>
  `).join('')

  container.innerHTML = `
    <!-- HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
      <div style="font-size: 10px; line-height: 1.6;">
        <div style="font-weight: bold; font-size: 12px; color: #1e3a5f;">CÔNG TY TNHH VIỆT TIẾN</div>
        <div>Địa chỉ: Số 5, Đường Lê Lợi, TP. Thái Bình</div>
        <div>Tel: 0227 3 123 456 | MST: 1000123456</div>
      </div>
      <div style="text-align: right; font-size: 9px; color: #64748b;">
        <div style="font-weight: bold; color: #1e3a5f;">Số: ${orderCode}</div>
        <div>${orderDateStr}</div>
      </div>
    </div>

    <!-- DIVIDER -->
    <div style="border-top: 2px solid #1e3a5f; margin-bottom: 6px;"></div>

    <!-- TITLE -->
    <div style="text-align: center; margin-bottom: 8px;">
      <h1 style="font-size: 18px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; margin: 0;">
        Phiếu Xác Nhận Đơn Hàng
      </h1>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">
        (Xác nhận nội bộ — Không phải hóa đơn VAT nhà nước)
      </div>
      ${isPaid && paymentMethod === 'sepay' ? `
        <div style="margin-top: 6px; padding: 4px 12px; background-color: #dcfce7; border: 2px solid #16a34a; border-radius: 4px; color: #15803d; font-weight: bold; font-size: 11px; letter-spacing: 0.05em;">
          ✓ ĐÃ THANH TOÁN CHUYỂN KHOẢN — KHÔNG THU THÊM TIỀN MẶT
        </div>
      ` : ''}
      ${isPaid && paymentMethod === 'cod' ? `
        <div style="margin-top: 4px; font-size: 9px; color: #64748b;">
          Hình thức: Thanh toán khi nhận hàng (COD)
        </div>
      ` : ''}
    </div>

    <!-- CUSTOMER INFO -->
    <div style="font-size: 11px; line-height: 1.8; margin-bottom: 10px;">
      <div style="display: flex;">
        <span style="white-space: nowrap;">Tên khách hàng:&nbsp;</span>
        <span style="border-bottom: 1px dotted black; flex: 1; font-weight: bold;">
          ${order.customerName || ''}
        </span>
      </div>
      <div style="display: flex;">
        <span style="white-space: nowrap;">Địa chỉ giao hàng:&nbsp;</span>
        <span style="border-bottom: 1px dotted black; flex: 1;">
          ${order.shippingAddress || ''}
        </span>
      </div>
      ${order.customerPhone ? `
      <div style="display: flex;">
        <span style="white-space: nowrap;">Số điện thoại:&nbsp;</span>
        <span style="border-bottom: 1px dotted black; flex: 1;">
          ${order.customerPhone}
        </span>
      </div>
      ` : ''}
    </div>

    <!-- PRODUCTS TABLE -->
    <div style="flex: 1; margin-bottom: 10px;">
      <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f8fafc; font-weight: bold; text-align: center; font-size: 10px;">
            <th style="border: 1px solid black; padding: 4px 6px; width: 40%;">Tên sản phẩm</th>
            <th style="border: 1px solid black; padding: 4px 6px; width: 8%;">ĐVT</th>
            <th style="border: 1px solid black; padding: 4px 6px; width: 10%;">SL</th>
            <th style="border: 1px solid black; padding: 4px 6px; width: 20%;">Đơn giá</th>
            <th style="border: 1px solid black; padding: 4px 6px; width: 22%;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          ${blankRowsHtml}
          <tr>
            <td colspan="4" style="border: 1px solid black; padding: 4px 6px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; background-color: #f8fafc;">
              Cộng
            </td>
            <td style="border: 1px solid black; padding: 4px 6px; text-align: right; font-weight: bold; color: #dc2626; background-color: #f8fafc;">
              ${formatPrice(subtotal)}
            </td>
          </tr>
          ${discountAmount > 0 ? `
          <tr>
            <td colspan="4" style="border: 1px solid black; padding: 3px 6px; text-align: right; font-size: 10px; color: #64748b;">
              Chiết khấu (${Math.round(discountRate * 100)}%)
            </td>
            <td style="border: 1px solid black; padding: 3px 6px; text-align: right; color: #64748b;">
              -${formatPrice(discountAmount)}
            </td>
          </tr>
          ` : ''}
          ${vat > 0 ? `
          <tr>
            <td colspan="4" style="border: 1px solid black; padding: 3px 6px; text-align: right; font-size: 10px; color: #64748b;">
              Thuế VAT (10%)
            </td>
            <td style="border: 1px solid black; padding: 3px 6px; text-align: right; color: #64748b;">
              +${formatPrice(vat)}
            </td>
          </tr>
          ` : ''}
          <tr style="background-color: #eff6ff;">
            <td colspan="4" style="border: 1px solid black; padding: 5px 6px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">
              Tổng thanh toán
            </td>
            <td style="border: 1px solid black; padding: 5px 6px; text-align: right; font-weight: bold; font-size: 13px; color: #b91c1c;">
              ${formatPrice(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- IN WORDS -->
    <div style="font-size: 11px; line-height: 1.6; margin-bottom: 10px;">
      <div style="display: flex; align-items: flex-start;">
        <span style="white-space: nowrap;">Thành tiền viết thành chữ:&nbsp;</span>
        <span style="flex: 1; font-weight: bold; font-style: italic;">
          ${numberToVietnameseWords(total)}
        </span>
      </div>
    </div>

    <!-- BANK INFO -->
    <div style="font-size: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 10px;">
      <div style="font-weight: bold; color: #1e3a5f; margin-bottom: 2px;">Thông tin tài khoản công ty:</div>
      <div>Ngân hàng TP Bank | STK: 71111810204 | Chủ TK: CONG TY VIET TIEN</div>
    </div>

    <!-- DATE + SIGNATURES -->
    <div style="font-size: 11px;">
      <div style="text-align: right; font-style: italic; font-weight: 500; margin-bottom: 8px;">
        ${orderDateFull}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-weight: bold; font-size: 11px; gap: 8px;">
        <div>
          <div>Người nhận hàng</div>
          <div style="font-size: 9px; font-weight: normal; color: #94a3b8; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
          <div style="height: 40px;"></div>
        </div>
        <div>
          <div>Người bán hàng</div>
          <div style="font-size: 9px; font-weight: normal; color: #94a3b8; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
          <div style="height: 40px;"></div>
        </div>
        <div>
          <div>Người giao hàng</div>
          <div style="font-size: 9px; font-weight: normal; color: #94a3b8; margin-top: 2px;">(Ký, ghi rõ họ tên)</div>
          <div style="height: 40px;"></div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 4px; text-align: center; font-size: 8px; color: #94a3b8;">
      Phiếu được xuất bởi Hệ thống Quản lý Việt Tiến | viettien.vn
    </div>
  `

  document.body.appendChild(container)

  try {
    // 3. Render HTML sang Canvas
    const canvas = await html2canvas(container, {
      scale: 2, 
      useCORS: true,
      logging: false,
    })

    // 4. Khởi tạo jsPDF (A5, Portrait)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const pdfWidth = 148
    const pdfHeight = 210

    // 5. Thêm ảnh vào PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)

    // 6. Lưu file hoặc xem trước
    if (action === 'view') {
      const blobUrl = pdf.output('bloburl')
      window.open(blobUrl, '_blank')
    } else {
      pdf.save(`HoaDon_VietTien_${orderCode || Date.now()}.pdf`)
    }
  } catch (error) {
    console.error('Lỗi xuất PDF:', error)
    throw new Error('Không thể xuất file PDF lúc này.')
  } finally {
    // 7. Dọn dẹp DOM
    document.body.removeChild(container)
  }
}
