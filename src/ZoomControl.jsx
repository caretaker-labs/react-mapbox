// @flow

import React, { PureComponent } from 'react';

import { MapboxConsumer } from './Mapbox';

type Props = {|
  className?: string,
  mapboxInstance: *,
|};

class ZoomControl extends PureComponent<Props> {
  handleZoomIn = () => this.props.mapboxInstance.zoomIn();
  handleZoomOut = () => this.props.mapboxInstance.zoomOut();

  render() {
    return (
      <div className={this.props.className}>
        <button onClick={this.handleZoomIn} type="button">+</button>
        <button onClick={this.handleZoomOut} type="button">-</button>
      </div>
    );
  }
}

const ZoomControlWithConsumer = (props: Props) => (
  <MapboxConsumer>
    <ZoomControl {...props} />
  </MapboxConsumer>
);
export default ZoomControlWithConsumer;
