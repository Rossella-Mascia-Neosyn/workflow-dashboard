import {
  BoxProps,
  Grid,
} from '@chakra-ui/react';
import React, { memo } from 'react';
import { EditorPanel } from './EditorPanel';
import { ResizableBox } from './ResizableBox';
import { useSimulation } from './SimulationContext';
import { useSourceActor } from './sourceMachine';

const PanelsView = (props: BoxProps) => {
  const simService = useSimulation();
  const [sourceState, sendToSourceService] = useSourceActor();

  return (
    <ResizableBox
      {...props}
      minHeight={0}
      data-testid="panels-view"
    >
      <Grid
        h='100%'
      >
        <EditorPanel
          onChangedCodeValue={(code) => {
            sendToSourceService({
              type: 'CODE_UPDATED',
              code,
              sourceID: sourceState.context.sourceID,
            });
          }}
          onChange={(machines) => {
            simService.send({
              type: 'MACHINES.REGISTER',
              machines,
            });
          }}
        />
      </Grid>
    </ResizableBox>
  );
};

export default PanelsView;