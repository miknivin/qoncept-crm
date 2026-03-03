import { usePipelineBoardContext } from "./board/PipelineBoardProvider";

export function usePipelineBoard() {
  return usePipelineBoardContext();
}
