import React, { useEffect, useMemo, useState } from 'react';
import { Box, ChakraProvider } from '@chakra-ui/react';
import { useActor, useInterpret, useSelector } from '@xstate/react';
import { theme } from './theme';
import { CanvasView } from './CanvasView';
import { EditorThemeProvider } from './themeContext';
import { PaletteProvider } from './PaletteContext';
import { paletteMachine } from './paletteMachine';
import { SimulationProvider } from './SimulationContext';
import { simulationMachine } from './simulationMachine';
import { CanvasProvider } from './CanvasContext';
import { useInterpretCanvas } from './useInterpretCanvas';
import PanelsView from './PanelsView';


function App() {
  const [isPanelViewVisibile, setIsPanelViewVisibile] = useState(false);
  const [isDarkMode, setDarkMode] = useState(false);

  const paletteService = useInterpret(paletteMachine);

  const simService = useInterpret(simulationMachine);


  const handlePanelView = () => setIsPanelViewVisibile(!isPanelViewVisibile);
  const handleDarkMode = () => { setDarkMode(!isDarkMode) };


  const canvasService = useInterpretCanvas({
    sourceID: '1',
  });

  return (
    <ChakraProvider theme={theme}>
      <EditorThemeProvider>
        <PaletteProvider value={paletteService}>
          <SimulationProvider value={simService}>
            <Box
              data-testid="app"
              data-viz-theme={isDarkMode ? 'dark' : 'light'}
              // as="main"
              display="grid"
              gridTemplateColumns="1fr auto"
              gridTemplateAreas="panels"
              height="100vh"
            >
              <CanvasProvider value={canvasService}>
                <CanvasView isDarkMode={isDarkMode} handleDarkMode={handleDarkMode} handlePanelView={handlePanelView} isShowPanel={isPanelViewVisibile} />
              </CanvasProvider>
              <PanelsView hidden={isPanelViewVisibile} />
            </Box>
          </SimulationProvider>
        </PaletteProvider>
      </EditorThemeProvider>
    </ChakraProvider>
  );
}

export default App;
