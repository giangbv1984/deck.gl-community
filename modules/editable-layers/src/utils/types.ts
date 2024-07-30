// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  Position,
} from 'geojson';

export type LayerMouseEventResult = {
  eventConsumed?: boolean;
  eventSoftConsumed?: boolean;
  mousePointer?: string | null | undefined;
  shouldRedraw?: boolean | string[];
};

// [red, green, blue, alpha] in premultiplied alpha format
export type Color = [number, number, number, number];

export type Style = {
  dashArray?: number[];
  fillColor?: Color;
  lineColor?: Color;
  lineWidthMeters?: number;
  pointRadiusMeters?: number;
  outlineRadiusMeters?: number;
  outlineColor?: Color;
  mousePriority?: number;
  arrowColor?: Color;
  arrowStyle?: number;
  arrowCount?: number;
  iconNumber?: number;
  text?: string;
  tooltip?: string;
  zLevel?: number;
};

export type Viewport = {
  width: number;
  height: number;
  longitude: number;
  latitude: number;
  zoom: number;
  isDragging?: boolean;
  isMoving?: boolean;
  bearing?: number;
  pitch?: number;
};

export type SupportedGeometry = Exclude<Geometry, GeometryCollection>;

export type AnyCoordinates = Position | Position[] | Position[][] | Position[][][];

export type FeatureCollectionWithSupportedGeometry = FeatureCollection<SupportedGeometry>;

export type FeatureWithSupportedGeometry = Feature<SupportedGeometry>;
