declare namespace L {
    
    function markerClusterGroup(options?: any): MarkerClusterGroup;
  
    interface MarkerClusterGroup extends FeatureGroup {
      addLayer(layer: Layer): this;
      removeLayer(layer: Layer): this;
      clearLayers(): this;
    }
  }
  