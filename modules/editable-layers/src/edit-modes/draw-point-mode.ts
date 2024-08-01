// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {ClickEvent, PointerMoveEvent, ModeProps, TentativeFeature} from './types';
import type {FeatureCollection, Point} from 'geojson';
import {GeoJsonEditMode} from './geojson-edit-mode';
import { FeatureCollectionWithSupportedGeometry } from '../utils/types';

export class DrawPointMode extends GeoJsonEditMode {
  createTentativeFeature(props: ModeProps<FeatureCollection>): TentativeFeature {
    const {lastPointerMoveEvent} = props;
    const lastCoords = lastPointerMoveEvent ? [lastPointerMoveEvent.mapCoords] : [];

    return {
      type: 'Feature',
      properties: {
        guideType: 'tentative'
      },
      geometry: {
        type: 'Point',
        coordinates: lastCoords[0]
      }
    };
  }

  handleClick({mapCoords}: ClickEvent, props: ModeProps<FeatureCollectionWithSupportedGeometry>): void {
    const geometry: Point = {
      type: 'Point',
      coordinates: mapCoords
    };

    props.onEdit(this.getAddFeatureAction(geometry, props.data));
  }

  handlePointerMove(event: PointerMoveEvent, props: ModeProps<FeatureCollectionWithSupportedGeometry>) {
    props.onUpdateCursor('cell');
    super.handlePointerMove(event, props);
  }
}
