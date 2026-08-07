import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from '../ToastContext.tsx'

/**
 * Sheet: FE-Contexts — L1-FEC-05 (ToastContext auto-dismiss).
 * Duration mặc định của showToast là 4000ms.
 */
const TOAST_DURATION_MS = 4000

function Trigger() {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast('success', 'Đã thêm vào giỏ')}>
      Bật toast
    </button>
  )
}

describe('L1-FEC · ToastContext', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // L1-FEC-05 | EP-Valid | showToast hiện toast rồi tự tắt sau timeout
  it('L1-FEC-05 showToast hiển thị nội dung rồi tự biến mất sau đúng thời lượng', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'Bật toast' }).click()
    })

    expect(screen.getByText('Đã thêm vào giỏ')).toBeInTheDocument()

    // Ngay trước mốc hết hạn: toast vẫn còn
    act(() => { vi.advanceTimersByTime(TOAST_DURATION_MS - 1) })
    expect(screen.getByText('Đã thêm vào giỏ')).toBeInTheDocument()

    // Qua mốc hết hạn: toast bị gỡ khỏi DOM
    act(() => { vi.advanceTimersByTime(2) })
    expect(screen.queryByText('Đã thêm vào giỏ')).not.toBeInTheDocument()
  })
})
