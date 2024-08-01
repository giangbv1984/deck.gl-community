// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {test, expect} from 'vitest';
import type {Feature, Point, MultiPoint, LineString, Polygon, MultiPolygon} from 'geojson';
import {translateFromCenter} from '../../src/utils/translate-from-center';

test('Point coordinates in right format', () => {
  const feature: Feature<Point> = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [0, 0]
    },
    properties: {}
  };
  const result = translateFromCenter(feature, 100, 100);
  expect(result.geometry.coordinates).toHaveLength(2);
});

test('MultiPoint coordinates in right format', () => {
  const feature: Feature<MultiPoint> = {
    type: 'Feature',
    geometry: {
      type: 'MultiPoint',
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2]
      ]
    },
    properties: {}
  };
  const result = translateFromCenter(feature, 100, 100);
  expect(result.geometry.coordinates[0]).toHaveLength(2);
  expect(result.geometry.coordinates[1]).toHaveLength(2);
  expect(result.geometry.coordinates[2]).toHaveLength(2);
});

test('LineString coordinates in right format', () => {
  const feature: Feature<LineString> = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [1, 1],
        [2, 2]
      ]
    },
    properties: {}
  };
  const result = translateFromCenter(feature, 100, 100);
  expect(result.geometry.coordinates[0]).toHaveLength(2);
  expect(result.geometry.coordinates[1]).toHaveLength(2);
});

test('Polygon coordinates in right format', () => {
  const feature: Feature<Polygon> = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [2, 2]
        ]
      ]
    },
    properties: {}
  };
  const result = translateFromCenter(feature, 100, 100);
  expect(result.geometry.coordinates[0][0]).toHaveLength(2);
  expect(result.geometry.coordinates[0][1]).toHaveLength(2);
  expect(result.geometry.coordinates[0][2]).toHaveLength(2);

  expect(result.geometry.coordinates[0][3]).toBeUndefined();
  expect(result.geometry.coordinates[1]).toBeUndefined();
});

test('Polygon coordinates in right format', () => {
  const feature: Feature<MultiPolygon> = {
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [0, 1],
            [2, 2]
          ],
          [
            [3, 3],
            [5, 3],
            [5, 5]
          ]
        ]
      ]
    },
    properties: {}
  };
  const result = translateFromCenter(feature, 100, 100);
  expect(result.geometry.coordinates[0][0][0]).toHaveLength(2);
  expect(result.geometry.coordinates[0][0][1]).toHaveLength(2);
  expect(result.geometry.coordinates[0][0][2]).toHaveLength(2);
  expect(result.geometry.coordinates[0][1][2]).toHaveLength(2);

  expect(result.geometry.coordinates[0][1][3]).toBeUndefined();
  expect(result.geometry.coordinates[0][2]).toBeUndefined();
});
