import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Nợ kỹ thuật lớn (400+ chỗ), dọn dần trong PR riêng thay vì chặn build/CI ngay.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Rule mới chuẩn bị cho React Compiler, hiện flag toàn bộ pattern fetch-on-mount
      // hợp lệ (useEffect gọi hàm async rồi setState) — không phải bug thật trong repo này.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
