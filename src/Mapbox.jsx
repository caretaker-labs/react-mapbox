// @flow

import React, { PureComponent, type Node, Fragment } from 'react';
import Script from '@flip-inc/react-script';

import type { EventResponse, Viewport } from './types';

const { Provider, Consumer } = React.createContext();

const enums = {
  TransitionTypes: {
    Ease: 'EASE',
    Fly: 'FLY',
    Jump: 'JUMP',
  },
};

type Props = {|
  children?: Node,
  mapbox: {|
    accessToken: string,
    style: string,
  |},
  onClick?: () => *,
  onError?: () => *,
  onLoad?: () => *,
  onMoveEnd?: (EventResponse) => *,
  onTouchEnd?: (EventResponse) => *,
  transitionType: $Values<typeof enums.TransitionTypes>,
  viewport: Viewport,
|};

type State = {|
  isReady: boolean,
|};

class Mapbox extends PureComponent<Props, State> {
  static enums = enums;
  static defaultProps = {
    transitionType: enums.TransitionTypes.Jump,
  };

  state = {
    isReady: false,
  };

  componentWillReceiveProps(nextProps: Props) {
    if (!window.mapboxgl || !window.mapboxInstance) return;

    if (this.props.viewport !== nextProps.viewport) {
      const mapboxInstance = window.mapboxInstance;
      const cameraOptions: {
        bearing?: number,
        center: [number, number],
        pitch?: number,
        zoom: number,
      } = {
        center: [nextProps.viewport.center.lng, nextProps.viewport.center.lat],
        zoom: nextProps.viewport.zoom,
      };

      if (nextProps.viewport.bearing) cameraOptions.bearing = nextProps.viewport.bearing;
      if (nextProps.viewport.pitch) cameraOptions.pitch = nextProps.viewport.pitch;

      switch (nextProps.transitionType) {
        case enums.TransitionTypes.Fly: {
          mapboxInstance.flyTo(cameraOptions);
          break;
        }
        case enums.TransitionTypes.Ease: {
          mapboxInstance.easeTo(cameraOptions);
          break;
        }
        default: {
          mapboxInstance.jumpTo(cameraOptions);
        }
      }
    }
  }

  componentWillUnmount() {
    if (window.mapboxInstance) {
      window.mapboxInstance.remove();
      window.mapboxInstance = null;
    }
  }

  handleMapReady = () => {
    this.setState({ isReady: true });
    if (this.props.onLoad) this.props.onLoad();
  };

  handleMoveEnd = () => {
    if (!window.mapboxInstance || !this.state.isReady) return;

    const response = this.getMapboxEventResponse();
    if (this.props.onMoveEnd) this.props.onMoveEnd(response);
  };

  handleTouchEnd = () => {
    if (!window.mapboxInstance || !this.state.isReady) return;

    const response = this.getMapboxEventResponse();
    if (this.props.onTouchEnd) this.props.onTouchEnd(response);
  };

  handleScriptLoad = () => {
    if (!this.isWebGLSupported()) return;

    const mapElement = document.getElementById('mapbox-map');

    if (window.mapboxInstance) {
      if (window.mapboxInstance.loaded()) {
        this.handleMapReady();
      } else {
        window.mapboxInstance.once('load', this.handleMapReady);
      }

      window.mapboxInstance.on('error', this.props.onError);
      window.mapboxInstance.on('moveend', this.handleMoveEnd);

      return;
    }

    window.mapboxgl.accessToken = this.props.mapbox.accessToken;
    window.mapboxInstance = new window.mapboxgl.Map({
      attributionControl: false,
      center: [this.props.viewport.center.lng, this.props.viewport.center.lat],
      container: mapElement,
      interactive: true,
      style: this.props.mapbox.style,
      zoom: this.props.viewport.zoom,
    });

    const mapboxInstance = window.mapboxInstance;
    mapboxInstance.once('load', this.handleMapReady);
    mapboxInstance.on('error', this.props.onError);
    mapboxInstance.on('touchend', this.handleTouchEnd);
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
            preReact: this.generatePreReactInitializer(),
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
          {this.state.isReady ? (
            <Provider value={window.mapboxInstance}>
              {this.props.children}
            </Provider>
          ) : null}
        </div>
      </Fragment>
    );
  }

  // This function is injected before React or rest of the app loads so that
  // the map is nearly ready by the time React is loaded
  generatePreReactInitializer = () => `
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
        window.mapboxgl.accessToken = ${this.props.mapbox.accessToken};

        window.mapboxInstance = new window.mapboxgl.Map({
          attributionControl: false,
          center: [${this.props.viewport.center.lng}, ${this.props.viewport.center.lat}],
          container: 'mapbox-map',
          interactive: true,
          style: '${this.props.mapbox.style}',
          zoom: ${this.props.viewport.zoom}
        });

        var canvas = window.mapboxInstance.getCanvas();
        if (canvas) canvas.style.outline = 'none';
      }
    }
  `;

  getMapboxEventResponse = () => {
    const mapboxInstance = window.mapboxInstance;
    const bounds = mapboxInstance.getBounds();
    const center = mapboxInstance.getCenter().toArray();

    return {
      bearing: mapboxInstance.getBearing(),
      bounds: {
        northeast: {
          lat: bounds.getNorth(),
          lng: bounds.getEast(),
        },
        southwest: {
          lat: bounds.getSouth(),
          lng: bounds.getWest(),
        },
      },
      center: {
        lat: center[1],
        lng: center[0],
      },
      pitch: mapboxInstance.getPitch(),
      zoom: mapboxInstance.getZoom(),
    };
  };

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

export const MapboxConsumer = (props: {|
  children: React$Element<*>,
|}) => (
  <Consumer>
    {value => React.cloneElement(props.children, { mapboxInstance: value })}
  </Consumer>
);
export default Mapbox;
