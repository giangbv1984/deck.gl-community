// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import turfCenter from '@turf/center';
import turfRhumbBearing from '@turf/rhumb-bearing';
import turfRhumbDistance from '@turf/rhumb-distance';
import turfRhumbDestination from '@turf/rhumb-destination';

import {mapCoords} from '../edit-modes/utils';
import {Position, Feature, Geometry} from 'geojson';

// This function takes feature's center, moves it,
// and builds new feature around it keeping the proportions
export function translateFromCenter<T extends Geometry>(
  feature: Feature<T>,
  distance: number,
  direction: number
) {

  if(feature.geometry.type === 'GeometryCollection') {
    throw new Error('translateFromCenter does not support GeometryCollection');
  }

  const initialCenterPoint = turfCenter(feature);

  const movedCenterPoint = turfRhumbDestination(initialCenterPoint, distance, direction);

  const movedCoordinates = mapCoords(feature.geometry.coordinates, (coordinate) => {
    const distance = turfRhumbDistance(
      initialCenterPoint.geometry.coordinates,
      coordinate as Position
    );
    const direction = turfRhumbBearing(
      initialCenterPoint.geometry.coordinates,
      coordinate as Position
    );

    const movedPosition = turfRhumbDestination(
      movedCenterPoint.geometry.coordinates,
      distance,
      direction
    ).geometry.coordinates;
    return movedPosition as Position;
  });

  feature.geometry.coordinates = movedCoordinates;

  return feature;
}
