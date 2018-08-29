// @flow

import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

type Props = {
  className?: string,
};

class MapboxZoomControl extends PureComponent<Props> {
  static contextTypes = {
    mapboxInstance: PropTypes.object,
  };

  handleZoomIn = () => this.context.mapboxInstance.zoomIn();
  handleZoomOut = () => this.context.mapboxInstance.zoomOut();

  render() {
    return (
      <div className={this.props.className}>
        <button onClick={this.handleZoomIn}>+</button>
        <button onClick={this.handleZoomOut}>-</button>
      </div>
    );
  }
}

export default MapboxZoomControl;
