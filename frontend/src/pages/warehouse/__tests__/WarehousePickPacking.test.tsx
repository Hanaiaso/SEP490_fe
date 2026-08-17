import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WarehousePickPacking from '../WarehousePickPacking.tsx'

/**
 * Sheet: FE-WarehousePickPacking — mục 11 (bằng chứng đóng gói bắt buộc) + mục 9 (xác nhận 2 bước).
 * "Hoàn tất Packing" phải bị khoá cho tới khi có đủ số thùng + cân nặng + ít nhất 1 ảnh bằng chứng,
 * và phải qua ConfirmModal trước khi thực sự gọi API.
 */

const getPickTasks = vi.fn()
const getPickTaskById = vi.fn()
const completePickTask = vi.fn()
const updateItemPickProgress = vi.fn()
const completePacking = vi.fn()
const acceptPickTask = vi.fn()

vi.mock('../../../services/warehouseService.js', () => ({
  getPickTasks: (...args: unknown[]) => getPickTasks(...args),
  getPickTaskById: (...args: unknown[]) => getPickTaskById(...args),
  completePickTask: (...args: unknown[]) => completePickTask(...args),
  updateItemPickProgress: (...args: unknown[]) => updateItemPickProgress(...args),
  completePacking: (...args: unknown[]) => completePacking(...args),
  acceptPickTask: (...args: unknown[]) => acceptPickTask(...args),
}))

const TASK_LIST = [
  {
    pickTaskId: 'task-1',
    orderId: 'order-1',
    orderCode: 'VT100001',
    finalPayment: 1_000_000,
    warehouseName: 'Kho Hà Nội',
    warehouseCode: 'WH-HN',
    status: 'Picking',
    items: [
      {
        productId: 'p1', productName: 'Ống PVC D21', sku: 'SKU001',
        requestedQuantity: 4, physicalStock: 10, isStockSufficient: true,
        packedQuantity: 4, remainingQuantity: 0, requiredTransferQuantity: 0,
      },
    ],
  },
]

const TASK_DETAIL = {
  orderId: 'order-1',
  orderCode: 'VT100001',
  status: 'Processing',
  createdAt: '2026-08-01T00:00:00Z',
  allocatedWarehouse: 'Kho Hà Nội',
  allocatedWarehouseCode: 'WH-HN',
  orderProgress: 100,
  pickingStartedAt: '2026-08-01T08:00:00Z',
  pickingCompletedAt: null,
  finalPayment: 1_000_000,
  items: [
    {
      productId: 'p1', productName: 'Ống PVC D21', sku: 'SKU001',
      requestedQuantity: 4, physicalStock: 10, isStockSufficient: true,
      packedQuantity: 4, remainingQuantity: 0, requiredTransferQuantity: 0,
    },
  ],
  pickTasks: [],
}

async function openDetail(user: ReturnType<typeof userEvent.setup>) {
  const row = (await screen.findByText('VT100001')).closest('tr') as HTMLElement
  const viewButton = within(row).getAllByRole('button')[0]
  await user.click(viewButton)
  await screen.findByText(/Chi tiết Pick & Packing/)
}

async function confirmModalAction(user: ReturnType<typeof userEvent.setup>, modalTitle: string, confirmLabel: string) {
  const heading = await screen.findByText(modalTitle)
  const modalBox = heading.closest('div') as HTMLElement
  await user.click(within(modalBox).getByRole('button', { name: confirmLabel }))
}

describe('WarehousePickPacking · bằng chứng đóng gói bắt buộc + xác nhận 2 bước', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPickTasks.mockResolvedValue(TASK_LIST)
    getPickTaskById.mockResolvedValue(TASK_DETAIL)
    completePickTask.mockResolvedValue({})
    updateItemPickProgress.mockResolvedValue({})
    completePacking.mockResolvedValue({})
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  // L1-PACK-01 | EP-Invalid | Chưa đủ số thùng/cân nặng/ảnh bằng chứng -> nút Hoàn tất Packing bị khoá
  it('L1-PACK-01 nút Hoàn tất Packing bị khoá khi thiếu bằng chứng', async () => {
    const user = userEvent.setup()
    render(<WarehousePickPacking />)
    await openDetail(user)

    // Hoàn tất Picking trước để vào trạng thái 'picked' -> hiện panel đóng gói.
    await user.click(screen.getByRole('button', { name: 'Hoàn tất Picking' }))
    await confirmModalAction(user, 'Xác nhận hoàn tất Picking', 'Hoàn tất Picking')
    await waitFor(() => expect(completePickTask).toHaveBeenCalledWith('task-1'))

    const packButton = await screen.findByRole('button', { name: /hoàn tất packing/i })
    expect(packButton).toBeDisabled()
  })

  // L1-PACK-02 | EP-Valid | Đủ số thùng + cân nặng + ảnh bằng chứng + xác nhận lần 2 -> gọi đúng API completePacking
  it('L1-PACK-02 đủ bằng chứng + qua ConfirmModal -> gọi completePacking với đúng dữ liệu', async () => {
    const user = userEvent.setup()
    render(<WarehousePickPacking />)
    await openDetail(user)

    await user.click(screen.getByRole('button', { name: 'Hoàn tất Picking' }))
    await confirmModalAction(user, 'Xác nhận hoàn tất Picking', 'Hoàn tất Picking')
    await waitFor(() => expect(completePickTask).toHaveBeenCalled())

    const packButton = await screen.findByRole('button', { name: /hoàn tất packing/i })
    expect(packButton).toBeDisabled()

    const boxCountInput = screen.getByText(/số thùng đóng gói/i).nextElementSibling as HTMLInputElement
    const weightInput = screen.getByText(/tổng trọng lượng/i).nextElementSibling as HTMLInputElement
    await user.type(boxCountInput, '3')
    await user.type(weightInput, '12.5')

    const file = new File(['bytes'], 'evidence.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => expect(packButton).toBeEnabled())
    await user.click(packButton)
    await confirmModalAction(user, 'Xác nhận hoàn tất đóng gói', 'Hoàn tất đóng gói')

    await waitFor(() => expect(completePacking).toHaveBeenCalledTimes(1))
    const [orderId, boxCount, weightKg, files] = completePacking.mock.calls[0]
    expect(orderId).toBe('order-1')
    expect(boxCount).toBe(3)
    expect(weightKg).toBe(12.5)
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('evidence.jpg')
  })
})
