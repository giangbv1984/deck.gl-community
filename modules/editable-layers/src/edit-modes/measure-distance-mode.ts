// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import turfDistance from '@turf/distance';
import turfMidpoint from '@turf/midpoint';
import {FeatureCollection, Position} from 'geojson';
import {
  ClickEvent,
  PointerMoveEvent,
  ModeProps,
  GuideFeatureCollection,
  Tooltip,
  GuideFeature
} from './types';
import {getPickedEditHandle} from './utils';
import {GeoJsonEditMode} from './geojson-edit-mode';
import { FeatureCollectionWithSupportedGeometry } from '../utils/types';

export class MeasureDistanceMode extends GeoJsonEditMode {
  _isMeasuringSessionFinished = false;
  _currentTooltips: Tooltip[] = [];
  _currentDistance = 0;

  _calculateDistanceForTooltip = ({positionA, positionB, modeConfig}) => {
    const {turfOptions, measurementCallback} = modeConfig || {};
    const distance = turfDistance(positionA, positionB, turfOptions);

    if (measurementCallback) {
      measurementCallback(distance);
    }

    return distance;
  };

  _formatTooltip(distance, modeConfig?) {
    const {formatTooltip, turfOptions} = modeConfig || {};
    const units = (turfOptions && turfOptions.units) || 'kilometers';

    let text;
    if (formatTooltip) {
      text = formatTooltip(distance);
    } else {
      // By default, round to 2 decimal places and append units
      text = `${parseFloat(distance).toFixed(2)} ${units}`;
    }

    return text;
  }

  handleClick(event: ClickEvent, props: ModeProps<FeatureCollectionWithSupportedGeometry>) {
    const {modeConfig, data, onEdit} = props;
    const {centerTooltipsOnLine = false} = modeConfig || {};

    // restart measuring session
    if (this._isMeasuringSessionFinished) {
      this._isMeasuringSessionFinished = false;
      this.resetClickSequence();
      this._currentTooltips = [];
      this._currentDistance = 0;
    }

    const {picks} = event;
    const clickedEditHandle = getPickedEditHandle(picks);

    let positionAdded = false;
    if (!clickedEditHandle) {
      // Don't add another point right next to an existing one
      this.addClickSequence(event);
      positionAdded = true;
    }
    const clickSequence = this.getClickSequence();

    if (
      clickSequence.length > 1 &&
      clickedEditHandle &&
      Array.isArray(clickedEditHandle.properties.positionIndexes) &&
      clickedEditHandle.properties.positionIndexes[0] === clickSequence.length - 1
    ) {
      // They clicked the last point (or double-clicked), so add the LineString
      this._isMeasuringSessionFinished = true;
    } else if (positionAdded) {
      if (clickSequence.length > 1) {
        this._currentDistance += this._calculateDistanceForTooltip({
          positionA: clickSequence[clickSequence.length - 2],
          positionB: clickSequence[clickSequence.length - 1],
          modeConfig
        });

        const tooltipPosition = centerTooltipsOnLine
          ? turfMidpoint(
              clickSequence[clickSequence.length - 2],
              clickSequence[clickSequence.length - 1]
            ).geometry.coordinates
          : event.mapCoords;

        this._currentTooltips.push({
          position: tooltipPosition as Position,
          text: this._formatTooltip(this._currentDistance, modeConfig)
        });
      }

      // new tentative point
      onEdit({
        // data is the same
        updatedData: data,
        editType: 'addTentativePosition',
        editContext: {
          position: event.mapCoords
        }
      });
    }
  }

  handleKeyUp(event: KeyboardEvent, props: ModeProps<FeatureCollectionWithSupportedGeometry>) {
    if (this._isMeasuringSessionFinished) return;

    event.stopPropagation();
    const {key} = event;

    const clickSequenceLength = this.getClickSequence().length;

    switch (key) {
      case 'Escape':
        this._isMeasuringSessionFinished = true;
        if (clickSequenceLength === 1) {
          this.resetClickSequence();
          this._currentTooltips = [];
        }
        // force update drawings
        props.onUpdateCursor('cell');
        break;
      case 'Enter':
        this.handleClick(props.lastPointerMoveEvent, props);
        this._isMeasuringSessionFinished = true;
        break;
      default:
        break;
    }
  }

  getGuides(props: ModeProps<FeatureCollectionWithSupportedGeometry>): GuideFeatureCollection {
    const {lastPointerMoveEvent} = props;
    const clickSequence = this.getClickSequence();

    const lastCoords =
      lastPointerMoveEvent && !this._isMeasuringSessionFinished
        ? [lastPointerMoveEvent.mapCoords]
        : [];

    const guides: GuideFeatureCollection = {
      type: 'FeatureCollection',
      features: []
    };

    if (clickSequence.length > 0) {
      guides.features.push({
        type: 'Feature',
        properties: {
          guideType: 'tentative'
        },
        geometry: {
          type: 'LineString',
          coordinates: [...clickSequence, ...lastCoords]
        }
      });
    }

    const editHandles: GuideFeature[] = clickSequence.map((clickedCoord, index) => ({
      type: 'Feature',
      properties: {
        guideType: 'editHandle',
        editHandleType: 'existing',
        featureIndex: -1,
        positionIndexes: [index]
      },
      geometry: {
        type: 'Point',
        coordinates: clickedCoord
      }
    }));

    guides.features.push(...editHandles);

    return guides;
  }

  handlePointerMove(event: PointerMoveEvent, props: ModeProps<FeatureCollectionWithSupportedGeometry>) {
    props.onUpdateCursor('cell');
  }

  getTooltips(props: ModeProps<FeatureCollectionWithSupportedGeometry>): Tooltip[] {
    const {lastPointerMoveEvent, modeConfig} = props;
    const {centerTooltipsOnLine = false} = modeConfig || {};
    const positions = this.getClickSequence();

    if (positions.length > 0 && lastPointerMoveEvent && !this._isMeasuringSessionFinished) {
      const distance = this._calculateDistanceForTooltip({
        positionA: positions[positions.length - 1],
        positionB: lastPointerMoveEvent.mapCoords,
        modeConfig: props.modeConfig
      });

      const tooltipPosition = centerTooltipsOnLine
        ? (turfMidpoint(positions[positions.length - 1], lastPointerMoveEvent.mapCoords).geometry
            .coordinates as Position)
        : lastPointerMoveEvent.mapCoords;

      return [
        ...this._currentTooltips,
        {
          position: tooltipPosition,
          text: this._formatTooltip(this._currentDistance + distance, modeConfig)
        }
      ];
    }

    return this._currentTooltips;
  }
}
