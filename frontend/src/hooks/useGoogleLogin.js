import { useEffect, useCallback } from 'react'

/**
 * Hook để sử dụng Google Sign-In.
 * @param {(idToken: string) => void} onSuccess - Callback nhận Google ID Token
 * @param {(error: string) => void} onError - Callback khi có lỗi
 */
export function useGoogleLogin(onSuccess, onError) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    // Chờ script Google GSI load xong
    const intervalId = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(intervalId)
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onSuccess(response.credential) // ID Token
            } else {
              onError?.('Không nhận được thông tin từ Google.')
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        // Tự động render nút Google chính thức vào div có id="google-login-btn"
        const btnContainer = document.getElementById('google-login-btn')
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: btnContainer.offsetWidth || 400,
            locale: 'vi'
          })
        }
      }
    }, 100)

    return () => clearInterval(intervalId)
  }, [clientId, onSuccess, onError])

  // Hàm dự phòng (prompt) nếu nút chính thức không thể render
  const triggerGoogleLogin = useCallback(() => {
    if (!window.google?.accounts?.id) {
      onError?.('Google Sign-In chưa sẵn sàng. Vui lòng thử lại.')
      return
    }
    if (!clientId) {
      onError?.('Chưa cấu hình Google Client ID trong file .env')
      return
    }
    window.google.accounts.id.prompt()
  }, [clientId, onError])

  return { triggerGoogleLogin }
}

