// @flow

import React, { Component, type Node, Fragment } from 'react';
import ResizeSensor from 'css-element-queries/src/ResizeSensor';
import Script from '@flip-inc/react-script';

const canUseDOM = () => !!(
  typeof window !== 'undefined'
  && window.document
  && window.document.createElement
);

type Bounds = {|
  maxLat: number,
  maxLng: number,
  minLat: number,
  minLng: number,
|};

type Center = {|
  lat: number,
  lng: number,
|};

type Props = {|
  onClick?: () => *,
  onError: () => *,
  onLoad: () => *,
  onDragEnd?: ({
    bounds: Bounds,
    center: Center,
  }) => *,
  onMoveEnd?: ({
    bounds: Bounds,
    center: Center,
  }) => *,
  bounds: Bounds,
  children?: Node,
  mapboxStyle: string,
|};

type State = {|
  isLoaded: boolean,
|};

class Mapbox extends Component<Props, State> {
  static defaultProps = {
    mapboxStyle: '',
    onError: () => {},
    onLoad: () => {},
  };

  state = {
    isLoaded: false,
  };

  componentWillReceiveProps(nextProps: Props) {
    if (!window.mapboxgl || !window.mapboxInstance) return;

    const mapboxInstance = window.mapboxInstance;
    const bounds = this.props.bounds;
    const nextBounds = nextProps.bounds;
    if (
      bounds.maxLat !== nextBounds.maxLat
      || bounds.minLat !== nextBounds.minLat
      || bounds.maxLng !== nextBounds.maxLng
      || bounds.minLat !== nextBounds.minLat
    ) {
      const newBounds = new window.mapboxgl.LngLatBounds(
        new window.mapboxgl.LngLat(nextBounds.minLng, nextBounds.minLat),
        new window.mapboxgl.LngLat(nextBounds.maxLng, nextBounds.maxLat),
      );
      mapboxInstance.jumpTo(mapboxInstance.cameraForBounds(newBounds));
    }
  }

  componentWillUnmount() {
    if (window.mapboxInstance) {
      window.mapboxInstance.remove();
      window.mapboxInstance = null;
    }

    if (this.resizeSensor) {
      this.resizeSensor.detach();
      this.resizeSensor = null;
    }
  }

  handleMapLoad = () => {
    this.setState({ isLoaded: true });
    if (this.props.onLoad) this.props.onLoad();
  };

  handleMoveEnd = (event: { originalEvent: SyntheticEvent<HTMLButtonElement> }) => {
    if (!window.mapboxInstance || !this.state.isLoaded) return;

    const mapboxInstance = window.mapboxInstance;
    const bounds = mapboxInstance.getBounds();
    const center = mapboxInstance.getCenter().toArray();

    const response = {
      bounds: {
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
      },
      center: {
        lat: center[1],
        lng: center[0],
      },
    };

    if (this.props.onMoveEnd) this.props.onMoveEnd(response);
    if (event.originalEvent && this.props.onDragEnd) this.props.onDragEnd(response);
  };

  handleResize = () => {
    if (window.mapboxInstance) window.mapboxInstance.resize();
  };

  handleScriptLoad = () => {
    if (!this.isWebGLSupported()) return;

    const mapContainerElement = document.getElementById('mapbox-container');
    const mapElement = document.getElementById('mapbox-map');

    this.resizeSensor = new ResizeSensor(mapContainerElement, this.handleResize);

    if (window.mapboxInstance) {
      this.handleMapLoad();

      window.mapboxInstance.on('error', this.props.onError);
      window.mapboxInstance.on('moveend', this.handleMoveEnd);

      return;
    }

    // window.mapboxgl.accessToken = Globals.MAPBOX_KEY;
    const bounds = new window.mapboxgl.LngLatBounds(
      new window.mapboxgl.LngLat(this.props.bounds.minLng, this.props.bounds.minLat),
      new window.mapboxgl.LngLat(this.props.bounds.maxLng, this.props.bounds.maxLat),
    );
    window.mapboxInstance = new window.mapboxgl.Map({
      attributionControl: false,
      center: bounds.getCenter().toArray(),
      container: mapElement,
      interactive: true,
      style: this.props.mapboxStyle,
      zoom: 10,
    });

    const mapboxInstance = window.mapboxInstance;
    const cameraOptions = mapboxInstance.cameraForBounds(bounds);
    mapboxInstance.setZoom(cameraOptions.zoom);
    mapboxInstance.once('load', this.handleMapLoad);
    mapboxInstance.on('error', this.props.onError);
    mapboxInstance.on('moveend', this.handleMoveEnd);

    // Disable outline style
    const canvas = mapboxInstance.getCanvas();
    if (canvas) canvas.style.outline = 'none';
  };

  render() {
    return (
      <Fragment>
        <Script
          onLoad={{
            react: this.handleScriptLoad,
            preReact: this.generateOnScriptLoadString(),
          }}
          url="https://api.tiles.mapbox.com/mapbox-gl-js/v0.48.0/mapbox-gl.js"
        />
        <div
          id="mapbox-container"
          style={{
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
          }}
          suppressHydrationWarning>
          <div // eslint-disable-line jsx-a11y/click-events-have-key-events
            className="mapboxgl-map"
            // Prevent React from overwriting non-React rendered map
            // eslint-disable-next-line
            dangerouslySetInnerHTML={{ __html: '' }}
            id="mapbox-map"
            onClick={this.props.onClick}
            style={{
              height: '100%',
              width: '100%',
            }}
            suppressHydrationWarning
          />
          {canUseDOM && window.mapboxInstance && this.state.isLoaded ? this.props.children : null}
        </div>
      </Fragment>
    );
  }

  resizeSensor = null;

  // This function is injected before React or rest of the app loads so that
  // the map is nearly ready by the time React is loaded
  generateOnScriptLoadString = () => `
    function () {
      function isWebGLSupported() {
        try {
          var canvas = document.createElement('canvas');
          return !!window.WebGLRenderingContext && (
            canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
          );
        } catch (e) {
          return false;
        }
      };

      if (isWebGLSupported()) {
        window.mapboxgl.accessToken = '/* KEY GOES HERE */';

        var bounds = new window.mapboxgl.LngLatBounds(
          new window.mapboxgl.LngLat(${this.props.bounds.minLng}, ${this.props.bounds.minLat}),
          new window.mapboxgl.LngLat(${this.props.bounds.maxLng}, ${this.props.bounds.maxLat})
        );

        window.mapboxInstance = new window.mapboxgl.Map({
          attributionControl: false,
          center: bounds.getCenter().toArray(),
          container: 'mapbox-map',
          interactive: true,
          style: '${this.props.mapboxStyle}',
          zoom: 10
        });

        var cameraOptions = window.mapboxInstance.cameraForBounds(bounds);
        window.mapboxInstance.setZoom(cameraOptions.zoom);

        var canvas = window.mapboxInstance.getCanvas();
        if (canvas) canvas.style.outline = 'none';
      }
    }
  `;

  isWebGLSupported = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && (
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      );
    } catch (e) {
      return false;
    }
  };
}

export default Mapbox;
