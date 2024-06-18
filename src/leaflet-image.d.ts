declare module 'leaflet-image' {
    import * as L from 'leaflet';
  
    type Callback = (err: any, canvas: HTMLCanvasElement) => void;
  
    const leafletImage: (map: L.Map, callback: Callback) => void;
  
    export default leafletImage;
  }
  