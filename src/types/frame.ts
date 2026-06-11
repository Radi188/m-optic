export interface FrameShapeItem {
  id: number;
  name: string;
  image: string;
}

export interface FrameShapesData {
  frame_shapes: FrameShapeItem[];
}

export interface FrameShapesResponse {
  status: 'success' | 'error';
  data: FrameShapesData;
}