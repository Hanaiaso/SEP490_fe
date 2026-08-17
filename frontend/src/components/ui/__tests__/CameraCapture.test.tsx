import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CameraCapture from '../CameraCapture.tsx'

/**
 * Sheet: FE-CameraCapture — chụp ảnh trực tiếp từ camera thiết bị (mục 4), luôn phải có lối thoát
 * "Chọn ảnh từ thiết bị" khi getUserMedia không khả dụng/bị từ chối quyền, không được tắc luồng.
 */
describe('CameraCapture · chụp ảnh trực tiếp + fallback file picker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // L1-CAM-01 | EP-Valid | Trạng thái ban đầu -> hiện cả 2 lựa chọn: Chụp ảnh + Chọn ảnh từ thiết bị
  it('L1-CAM-01 hiện đủ 2 nút: Chụp ảnh và Chọn ảnh từ thiết bị', () => {
    render(<CameraCapture onCapture={vi.fn()} />)

    expect(screen.getByRole('button', { name: /chụp ảnh/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /chọn ảnh từ thiết bị/i })).toBeInTheDocument()
  })

  // L1-CAM-02 | EP-Invalid | Thiết bị không hỗ trợ getUserMedia -> không tắc luồng, chuyển sang chế
  // độ "unavailable" hiện cảnh báo + fallback chọn ảnh từ thiết bị.
  it('L1-CAM-02 thiết bị không hỗ trợ camera -> hiện cảnh báo và fallback chọn ảnh', async () => {
    const user = userEvent.setup()
    const originalMediaDevices = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })

    render(<CameraCapture onCapture={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /chụp ảnh/i }))

    expect(await screen.findByText(/không thể mở camera/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /chọn ảnh từ thiết bị/i })).toBeInTheDocument()

    Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true })
  })

  // L1-CAM-03 | EP-Invalid | Người dùng từ chối quyền camera (getUserMedia reject) -> vẫn không tắc
  // luồng, tự động chuyển sang fallback chọn ảnh từ thiết bị.
  it('L1-CAM-03 từ chối quyền camera -> tự động chuyển sang fallback chọn ảnh', async () => {
    const user = userEvent.setup()
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })

    render(<CameraCapture onCapture={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /chụp ảnh/i }))

    expect(await screen.findByText(/không thể mở camera/i)).toBeInTheDocument()
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } })
  })

  // L1-CAM-04 | EP-Valid | Chọn ảnh qua input file thường -> gọi onCapture đúng file, quay lại idle
  it('L1-CAM-04 chọn ảnh từ thiết bị (input file) -> gọi onCapture với đúng file', async () => {
    const user = userEvent.setup()
    const onCapture = vi.fn()
    const { container } = render(<CameraCapture onCapture={onCapture} />)

    const file = new File(['fake-bytes'], 'evidence.jpg', { type: 'image/jpeg' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1))
    expect(onCapture.mock.calls[0][0].name).toBe('evidence.jpg')
    // Quay lại idle -> vẫn còn đủ 2 nút, sẵn sàng cho lượt chụp bằng chứng tiếp theo.
    expect(screen.getByRole('button', { name: /chụp ảnh/i })).toBeInTheDocument()
  })

  // L1-CAM-05 | EP-Valid | Camera mở thành công -> hiện nút "Chụp" và "Hủy" thay vì lựa chọn ban đầu
  it('L1-CAM-05 camera mở thành công -> chuyển sang chế độ xem trước với nút Chụp/Hủy', async () => {
    const user = userEvent.setup()
    const fakeTrack = { stop: vi.fn() }
    const fakeStream = { getTracks: () => [fakeTrack] } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream)
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
    // jsdom's HTMLMediaElement.play luôn throw "not implemented" -> component đã .catch(() => {}) sẵn.
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)

    render(<CameraCapture onCapture={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /chụp ảnh/i }))

    expect(await screen.findByRole('button', { name: /^chụp$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hủy/i })).toBeInTheDocument()
  })
})
