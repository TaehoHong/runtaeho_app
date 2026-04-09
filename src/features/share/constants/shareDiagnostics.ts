export type AndroidShareDiagnosticMode =
  | 'surface-composition-proof'
  | 'crop-proof'
  | 'window-scaled-crop'
  | 'annotated-comparison'
  | 'annotated-raw'
  | 'raw-screenshot'
  | 'cropped-no-resize'
  | 'cropped-and-resized';

export const ANDROID_SHARE_DIAGNOSTIC_MODE: AndroidShareDiagnosticMode = 'cropped-and-resized';

export type ShareDiagnosticMarkerId =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'center';

export interface ShareDiagnosticMarker {
  id: ShareDiagnosticMarkerId;
  colorHex: string;
  placement: ShareDiagnosticMarkerId;
}

export const SHARE_DIAGNOSTIC_MARKER_SIZE = 24;
export const SHARE_DIAGNOSTIC_MARKER_INSET = 18;

export const SHARE_DIAGNOSTIC_MARKERS: ShareDiagnosticMarker[] = [
  { id: 'topLeft', colorHex: '#FF0055', placement: 'topLeft' },
  { id: 'topRight', colorHex: '#00D1FF', placement: 'topRight' },
  { id: 'bottomLeft', colorHex: '#B8FF00', placement: 'bottomLeft' },
  { id: 'bottomRight', colorHex: '#FF8A00', placement: 'bottomRight' },
  { id: 'center', colorHex: '#7A00FF', placement: 'center' },
];
