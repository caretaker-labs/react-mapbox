// @flow

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import { deepFreeze } from '~/utils/object';

import Script from '~/components/utility/Script';

const enums = deepFreeze({
  TransportMethods: {
    Cycling: 'BICYCLING',
    Driving: 'DRIVING',
    Transit: 'TRANSIT',
    Walking: 'WALKING',
  },
});

const ROUTE_LAYER_ID = 'ROUTE';

type GoogleDirections = {|
  request: {|
    destination: {|
      location: {|
        lat: () => number,
        lng: () => number,
      |},
    |},
    origin: {|
      location: {|
        lat: () => number,
        lng: () => number,
      |},
    |},
  |},
  routes: {|
    overview_path: {|
      lat: () => number,
      lng: () => number,
    |}[],
    legs: {|
      duration: {|
        text: string,
        value: number,
      |},
    |}[],
  |}[]
|};

type Coordinates = {|
  lat: number,
  lng: number,
|};

type Props = {|
  destination: string | Coordinates,
  onRouteChange?: ({
    coordinatePath: number[][],
    destination: Coordinates,
    origin: Coordinates,
    travelTime: number,
  }) => *,
  origin: string | Coordinates,
  transportMethod: $Values<typeof enums.TransportMethods>,
|};

class MapboxRoute extends PureComponent<Props> {
  static enums = enums;
  static contextTypes = {
    mapboxInstance: PropTypes.object,
  };
  static defaultProps = {
    transportMethod: enums.TransportMethods.Driving,
  };

  componentDidUpdate() {
    this.updateRoute();
  }

  componentWillUnmount() {
    const mapboxInstance = this.context.mapboxInstance;
    if (!mapboxInstance.loaded()) return;

    if (mapboxInstance.getLayer(ROUTE_LAYER_ID)) mapboxInstance.removeLayer(ROUTE_LAYER_ID);
    if (mapboxInstance.getSource(ROUTE_LAYER_ID)) mapboxInstance.removeSource(ROUTE_LAYER_ID);
  }

  handleScriptLoad = () => {
    this.directionsService = new window.google.maps.DirectionsService();

    this.updateRoute();
  };

  render() {
    return (
      <Script
        onLoad={this.handleScriptLoad}
        url={`https://maps.googleapis.com/maps/api/js?key=/* KEY GOES HERE */&libraries=places`}
      />
    );
  }

  directionsService = null;
  marker = null;

  updateRoute = () => {
    const directionsService = this.directionsService;
    if (!directionsService) return;

    const mapboxInstance = this.context.mapboxInstance;
    if (!mapboxInstance) return;

    const LatLng = window.google.maps.LatLng;
    const origin = this.props.origin;
    const destination = this.props.destination;
    directionsService.route({
      origin: origin.lng && origin.lat ? new LatLng(origin.lat, origin.lng) : origin,
      destination: destination.lng && destination.lat ? new LatLng(destination.lat, destination.lng) : destination,
      travelMode: this.props.transportMethod,
    }, (response: GoogleDirections, status: string) => {
      if (status === 'OK' && response.routes.length && response.routes[0].legs.length) {
        const route = response.routes[0];
        const rawPath = route.overview_path;
        const path: number[][] = _.map(rawPath, coordinatePair => [coordinatePair.lng(), coordinatePair.lat()]);

        if (mapboxInstance.getLayer(ROUTE_LAYER_ID)) mapboxInstance.removeLayer(ROUTE_LAYER_ID);
        if (mapboxInstance.getSource(ROUTE_LAYER_ID)) mapboxInstance.removeSource(ROUTE_LAYER_ID);

        mapboxInstance.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: path,
              },
            },
          },
          layout: {
            'line-cap': 'round',
          },
          paint: {
            'line-opacity': 0.75,
            'line-color': '#1f8eed',
            'line-width': 4,
          },
        });

        const onRouteChange = this.props.onRouteChange;
        if (onRouteChange) {
          onRouteChange({
            coordinatePath: path,
            destination: {
              lng: response.request.destination.location.lng(),
              lat: response.request.destination.location.lat(),
            },
            origin: {
              lng: response.request.origin.location.lng(),
              lat: response.request.origin.location.lat(),
            },
            travelTime: route.legs[0].duration.value,
          });
        }
      }
    });
  }
}

export default MapboxRoute;
