// eslint.config.js
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react'; // React 플러그인 추가
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist'] },
    {
      extends: [js.configs.recommended],
      files: ['**/*.{js,jsx}'],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        parserOptions: {
          ecmaFeatures: {
            jsx: true  // JSX 기능 활성화
          }
        }
      },
      plugins: {
        'react': reactPlugin,  // React 플러그인 추가
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
      },
    },

    // TypeScript 파일에 대한 설정
    {
      extends: [...tseslint.configs.recommended],
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        parserOptions: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
          tsconfigRootDir: import.meta.dirname,
          ecmaFeatures: {
            jsx: true  // JSX 기능 활성화
          }
        }
      },
      plugins: {
        'react': reactPlugin,  // React 플러그인 추가
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
      },
    },
);