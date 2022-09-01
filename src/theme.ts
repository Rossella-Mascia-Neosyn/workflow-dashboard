// 1. import `extendTheme` function
import { extendTheme, ThemeConfig } from '@chakra-ui/react';
// 2. Add your color mode config
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// 3. extend the theme
export const theme = extendTheme({
  config,
  styles: {
    global: {
      '*, *:before, *:after': {
        position: 'relative',
      },
      body: {
        overflow: 'hidden',
        overscrollBehavior: 'none',
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
      },
      '#root': {
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      },
      '.monaco-editor *': {
        position: 'static',
      },
    },
  },
  components: {
    Button: {
      variants: {
        secondary: {
          bg: '#007a91',
          color: 'white',
          _hover: {
            bg: '#006375',
          },
        },
        secondaryPressed: {
          bg: '#007a91',
          color: 'white',
          _hover: {
            bg: '#006375',
            color: 'white',
          },
        },
        outline: {
          bg: 'transparent',
          borderWidth: '0.1rem',
          color: 'white',
          _hover: {
            bg: '#006375',
          },
          _active: {
            bg: '#006375',
          }
        },
      },
    },
  }
});
