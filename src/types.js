// @flow

export type CoordinatePair = {|
  lat: number,
  lng: number,
|};

export type Bounds = {|
  northeast: CoordinatePair,
  southwest: CoordinatePair,
|};

export type Viewport = {|
  bearing?: number,
  center: CoordinatePair,
  pitch?: number,
  zoom: number,
|};

export type EventResponse = {|
  bearing: number,
  bounds: Bounds,
  center: CoordinatePair,
  pitch: number,
  zoom: number,
|};
