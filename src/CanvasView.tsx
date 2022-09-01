import {
  AddIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  RepeatIcon,
  MoonIcon,
  SunIcon
} from '@chakra-ui/icons';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Grid,
  IconButton,
  Spinner,
  VStack,
} from '@chakra-ui/react';
import { useSelector } from '@xstate/react';
import React, { useMemo } from 'react';
import { CanvasContainer } from './CanvasContainer';
import { useCanvas } from './CanvasContext';
import { canZoom, canZoomIn, canZoomOut } from './canvasMachine';
import { toDirectedGraph } from './directedGraph';
import { Graph } from './Graph';
import { useSimulation, useSimulationMode } from './SimulationContext';
import { Overlay } from './Overlay';
import { CompressIcon, HandIcon } from './Icons';

type CanvasViewProps = {
  handlePanelView: () => void,
  handleDarkMode: () => void,
  isShowPanel: boolean,
  isDarkMode: boolean
}

export const CanvasView: React.FC<CanvasViewProps> = ({ handlePanelView, isShowPanel, handleDarkMode, isDarkMode }) => {
  // TODO: refactor this so an event can be explicitly sent to a machine
  // it isn't straightforward to do at the moment cause the target machine lives in a child component
  const [panModeEnabled, setPanModeEnabled] = React.useState(false);
  const simService = useSimulation();
  const canvasService = useCanvas();
  // const [sourceState] = useSourceActor();
  const machine = useSelector(simService, (state) => {
    return state.context.currentSessionId
      ? state.context.serviceDataMap[state.context.currentSessionId!]?.machine
      : undefined;
  });
  debugger;
  const isLayoutPending = useSelector(simService, (state) =>
    state.hasTag('layoutPending'),
  );
  console.log(isLayoutPending, 'isLayoutPending')
  const digraph = useMemo(
    //@ts-ignore
    () => (machine ? toDirectedGraph(machine) : undefined),
    [machine],
  );

  const shouldEnableZoomOutButton = true;
  const shouldEnableZoomInButton = true;
  const simulationMode = useSimulationMode();
  const showControls = true;
  const showZoomButtonsInEmbed = true;
  const showPanButtonInEmbed = true;

  return (
    <Grid
      h='100%'
    >
      <CanvasContainer panModeEnabled={panModeEnabled}>
        <Flex justify="end" pt={2} pr={2}>
          <IconButton
            style={{ zIndex: 3 }}
            aria-label="Full screen"
            icon={isShowPanel ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            size="sm"
            marginLeft={2}
            onClick={handlePanelView}
            aria-pressed={isShowPanel}
            variant='secondary'
          />
          <IconButton
            style={{ zIndex: 3 }}
            aria-label="Full screen"
            icon={isDarkMode ? <SunIcon /> : <MoonIcon />}
            size="sm"
            marginLeft={2}
            onClick={handleDarkMode}
            aria-pressed={isDarkMode}
            variant='secondary'
          />
        </Flex>

        {digraph && <Graph digraph={digraph} />}
        {isLayoutPending && (
          <Overlay>
            <Box textAlign="center">
              <VStack spacing="4">
                <Spinner size="xl" />
                <Box>Visualizing machine...</Box>
              </VStack>
            </Box>
          </Overlay>
        )}
      </CanvasContainer>

      {showControls && (
        <Box
          style={{ display: 'flex', padding: '20px', position: 'absolute', bottom: 0, width: '100%' }}
        >
          <ButtonGroup size="sm" spacing={2} isAttached>
            {showZoomButtonsInEmbed && (
              <>
                <IconButton
                  aria-label="Zoom out"
                  title="Zoom out"
                  icon={<MinusIcon />}
                  disabled={!shouldEnableZoomOutButton}
                  onClick={() => canvasService.send('ZOOM.OUT')}
                  variant="secondary"
                />
                <IconButton
                  aria-label="Zoom in"
                  title="Zoom in"
                  icon={<AddIcon />}
                  disabled={!shouldEnableZoomInButton}
                  onClick={() => canvasService.send('ZOOM.IN')}
                  variant="secondary"
                />
              </>
            )}
            <IconButton
              aria-label="Fit to content"
              title="Fit to content"
              icon={<CompressIcon />}
              onClick={() => canvasService.send('FIT_TO_CONTENT')}
              variant="secondary"
            />

            <IconButton
              aria-label="Reset canvas"
              title="Reset canvas"
              icon={<RepeatIcon />}
              onClick={() => canvasService.send('POSITION.RESET')}
              variant="secondary"
            />

          </ButtonGroup>
          {showPanButtonInEmbed && (
            <IconButton
              aria-label="Pan mode"
              icon={<HandIcon />}
              size="sm"
              marginLeft={2}
              onClick={() => setPanModeEnabled((v) => !v)}
              aria-pressed={panModeEnabled}
              variant={panModeEnabled ? 'secondaryPressed' : 'secondary'}
            />
          )}
          {simulationMode === 'visualizing' && (
            <Button
              size="sm"
              marginLeft={2}
              onClick={() => simService.send('MACHINES.RESET')}
              variant="secondary"
            >
              RESET
            </Button>
          )}
        </Box>
      )}
    </Grid>
  );
};
