import { useInterpret } from '@xstate/react';
import { useEffect } from 'react';
import { canvasMachine, canvasModel } from './canvasMachine';
import './Graph';

export const useInterpretCanvas = ({
  sourceID,
}: {
  sourceID: string | null;
}) => {
  const canvasService = useInterpret(canvasMachine, {
    context: {
      ...canvasModel.initialContext,
    },
  });

  useEffect(() => {
    canvasService.send({
      type: 'SOURCE_CHANGED',
      id: sourceID,
    });
  }, [sourceID, canvasService]);

  return canvasService;
};
