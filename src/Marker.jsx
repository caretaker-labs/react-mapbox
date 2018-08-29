// @flow
import React, { PureComponent, type Node } from 'react';

import { MapboxConsumer } from './Mapbox';

type Props = {|
  children: Node,
  isHighlighted: boolean,
  latitude: number,
  longitude: number,
  mapboxInstance: *,
|};

type State = {|
  position: {|
    x: number,
    y: number,
  |},
|};

class Marker extends PureComponent<Props, State> {
  static defaultProps = {
    isHighlighted: false,
  };

  state = {
    position: {
      x: 0,
      y: 0,
    },
  };

  componentDidMount() {
    this.props.mapboxInstance.on('move', this.handleUpdatePosition);
    this.handleUpdatePosition();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.latitude !== this.props.latitude || prevProps.longitude !== this.props.longitude) {
      this.handleUpdatePosition();
    }
  }

  componentWillUnmount() {
    this.props.mapboxInstance.off('move', this.handleUpdatePosition);
  }

  handleUpdatePosition = () => {
    if (!window.mapboxgl) return;

    const mapboxInstance = this.props.mapboxInstance;
    const point = mapboxInstance.project(window.mapboxgl.LngLat.convert([this.props.longitude, this.props.latitude]));

    this.setState({
      position: {
        x: point.x.toFixed(0),
        y: point.y.toFixed(0),
      },
    });
  };

  render() {
    return (
      <div
        className="mapboxgl-marker"
        style={{
          transform: `translate(${this.state.position.x}px, ${this.state.position.y}px) translate(0px, 0px) translate(-50%, -100%)`,
          WebkitBackfaceVisibility: 'hidden',
          zIndex: this.props.isHighlighted ? 2 : 1,
        }}>
        {this.props.children}
      </div>
    );
  }

  marker = null;
}

const MarkerWithConsumer = (props: Props) => (
  <MapboxConsumer>
    <Marker {...props} />
  </MapboxConsumer>
);
export default MarkerWithConsumer;
