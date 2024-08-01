// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

// TODO edit-modes: delete handlers once EditMode fully implemented

import turfUnion from '@turf/union';
import turfDifference from '@turf/difference';
import turfIntersect from '@turf/intersect';

import type {FeatureCollection, Polygon, Position, Geometry} from 'geojson';

import {
  ClickEvent,
  Pick,
  PointerMoveEvent,
  StartDraggingEvent,
  StopDraggingEvent
} from '../edit-modes/types';
import {ImmutableFeatureCollection} from '../edit-modes/immutable-feature-collection';
import turfHelpers from '@turf/helpers';
import { FeatureCollectionWithSupportedGeometry, FeatureWithSupportedGeometry, SupportedGeometry } from '../utils/types';

export type EditHandleType = 'existing' | 'intermediate' | 'snap';

export type EditHandle = {
  position: Position;
  positionIndexes: number[];
  featureIndex: number;
  type: EditHandleType;
};

export type EditAction = {
  updatedData: FeatureCollectionWithSupportedGeometry;
  editType: string;
  featureIndexes: number[];
  editContext: any;
};

export class ModeHandler {
  // TODO: add underscore
  featureCollection: ImmutableFeatureCollection = undefined!;
  _tentativeFeature: FeatureWithSupportedGeometry | null | undefined;
  _modeConfig: any = null;
  _selectedFeatureIndexes: number[] = [];
  _clickSequence: Position[] = [];

  constructor(featureCollection?: FeatureCollectionWithSupportedGeometry) {
    if (featureCollection) {
      this.setFeatureCollection(featureCollection);
    }
  }

  getFeatureCollection(): FeatureCollection {
    return this.featureCollection.getObject();
  }

  getImmutableFeatureCollection(): ImmutableFeatureCollection {
    return this.featureCollection;
  }

  getSelectedFeature(): FeatureWithSupportedGeometry | null | undefined {
    if (this._selectedFeatureIndexes.length === 1) {
      return this.featureCollection.getObject().features[this._selectedFeatureIndexes[0]];
    }
    return null;
  }

  getSelectedGeometry(): SupportedGeometry | null | undefined {
    const feature = this.getSelectedFeature();
    if (feature) {
      return feature.geometry;
    }
    return null;
  }

  getSelectedFeaturesAsFeatureCollection(): FeatureCollectionWithSupportedGeometry {
    const {features} = this.featureCollection.getObject();
    const selectedFeatures = this.getSelectedFeatureIndexes().map(
      (selectedIndex) => features[selectedIndex]
    );
    return {
      type: 'FeatureCollection',
      features: selectedFeatures
    };
  }

  setFeatureCollection(featureCollection: FeatureCollectionWithSupportedGeometry): void {
    this.featureCollection = new ImmutableFeatureCollection(featureCollection);
  }

  getModeConfig(): any {
    return this._modeConfig;
  }

  setModeConfig(modeConfig: any): void {
    if (this._modeConfig === modeConfig) {
      return;
    }

    this._modeConfig = modeConfig;
    this._setTentativeFeature(null);
  }

  getSelectedFeatureIndexes(): number[] {
    return this._selectedFeatureIndexes;
  }

  setSelectedFeatureIndexes(indexes: number[]): void {
    if (this._selectedFeatureIndexes === indexes) {
      return;
    }

    this._selectedFeatureIndexes = indexes;
    this._setTentativeFeature(null);
  }

  getClickSequence(): Position[] {
    return this._clickSequence;
  }

  resetClickSequence(): void {
    this._clickSequence = [];
  }

  getTentativeFeature(): FeatureWithSupportedGeometry | null | undefined {
    return this._tentativeFeature;
  }

  // TODO: remove the underscore
  _setTentativeFeature(tentativeFeature: FeatureWithSupportedGeometry | null | undefined): void {
    this._tentativeFeature = tentativeFeature;
    if (!tentativeFeature) {
      // Reset the click sequence
      this._clickSequence = [];
    }
  }

  /**
   * Returns a flat array of positions for the given feature along with their indexes into the feature's geometry's coordinates.
   *
   * @param featureIndex The index of the feature to get edit handles
   */
  getEditHandles(picks?: Array<Record<string, any>>, mapCoords?: Position): EditHandle[] {
    return [];
  }

  getCursor({isDragging}: {isDragging: boolean}): string {
    return 'cell';
  }

  isSelectionPicked(picks: Pick[]): boolean {
    if (!picks.length) return false;
    const pickedIndexes = picks.map(({index}) => index);
    const selectedFeatureIndexes = this.getSelectedFeatureIndexes();
    return selectedFeatureIndexes.some((index) => pickedIndexes.includes(index));
  }

  getAddFeatureAction(geometry: SupportedGeometry): EditAction {
    // Unsure why flow can't deal with Geometry type, but there I fixed it
    const geometryAsAny: any = geometry;

    const updatedData = this.getImmutableFeatureCollection()
      .addFeature({
        type: 'Feature',
        properties: {},
        geometry: geometryAsAny
      })
      .getObject();

    return {
      updatedData,
      editType: 'addFeature',
      featureIndexes: [updatedData.features.length - 1],
      editContext: {
        featureIndexes: [updatedData.features.length - 1]
      }
    };
  }

  getAddManyFeaturesAction(featureCollection: FeatureCollection): EditAction {
    const features = featureCollection.features;
    let updatedData = this.getImmutableFeatureCollection();
    const initialIndex = updatedData.getObject().features.length;
    const updatedIndexes: number[] = [];
    for (const feature of features) {
      const {properties, geometry} = feature;
      const geometryAsAny: any = geometry;
      updatedData = updatedData.addFeature({
        type: 'Feature',
        properties,
        geometry: geometryAsAny
      });
      updatedIndexes.push(initialIndex + updatedIndexes.length);
    }

    return {
      updatedData: updatedData.getObject(),
      editType: 'addFeature',
      featureIndexes: updatedIndexes,
      editContext: {
        featureIndexes: updatedIndexes
      }
    };
  }

  getAddFeatureOrBooleanPolygonAction(geometry: Polygon): EditAction | null | undefined {
    const selectedFeature = this.getSelectedFeature();
    const modeConfig = this.getModeConfig();
    if (modeConfig && modeConfig.booleanOperation) {
      if (
        !selectedFeature ||
        (selectedFeature.geometry.type !== 'Polygon' &&
          selectedFeature.geometry.type !== 'MultiPolygon')
      ) {
        // eslint-disable-next-line no-console,no-undef
        console.warn(
          'booleanOperation only supported for single Polygon or MultiPolygon selection'
        );
        return null;
      }

      const feature = {
        type: 'Feature',
        geometry
      };

      let updatedGeometry;
      if (modeConfig.booleanOperation === 'union') {
        // @ts-expect-error turf types diff
        updatedGeometry = turfUnion(selectedFeature, feature);
      } else if (modeConfig.booleanOperation === 'difference') {
        // @ts-expect-error turf type diff
        updatedGeometry = turfDifference(turfHelpers.featureCollection([selectedFeature, feature]));
      } else if (modeConfig.booleanOperation === 'intersection') {
        // @ts-expect-error turf type diff
        updatedGeometry = turfIntersect(selectedFeature, feature);
      } else {
        // eslint-disable-next-line no-console,no-undef
        console.warn(`Invalid booleanOperation ${modeConfig.booleanOperation}`);
        return null;
      }

      if (!updatedGeometry) {
        // eslint-disable-next-line no-console,no-undef
        console.warn('Canceling edit. Boolean operation erased entire polygon.');
        return null;
      }

      const featureIndex = this.getSelectedFeatureIndexes()[0];

      const updatedData = this.getImmutableFeatureCollection()
        .replaceGeometry(featureIndex, updatedGeometry.geometry)
        .getObject();

      const editAction: EditAction = {
        updatedData,
        editType: 'unionGeometry',
        featureIndexes: [featureIndex],
        editContext: {
          featureIndexes: [featureIndex]
        }
      };

      return editAction;
    }
    return this.getAddFeatureAction(geometry);
  }

  handleClick(event: ClickEvent): EditAction | null | undefined {
    this._clickSequence.push(event.mapCoords);

    return null;
  }

  handlePointerMove(event: PointerMoveEvent): {
    editAction: EditAction | null | undefined;
    cancelMapPan: boolean;
  } {
    return {editAction: null, cancelMapPan: false};
  }

  handleStartDragging(event: StartDraggingEvent): EditAction | null | undefined {
    return null;
  }

  handleStopDragging(event: StopDraggingEvent): EditAction | null | undefined {
    return null;
  }
}

export function getPickedEditHandle(
  picks: any[] | null | undefined
): EditHandle | null | undefined {
  const info = picks && picks.find((pick) => pick.isEditingHandle);
  if (info) {
    return info.object;
  }
  return null;
}

export function getIntermediatePosition(position1: Position, position2: Position): Position {
  const intermediatePosition: Position = [
    (position1[0] + position2[0]) / 2.0,
    (position1[1] + position2[1]) / 2.0
  ];

  return intermediatePosition;
}

export function getEditHandlesForGeometry(
  geometry: Geometry,
  featureIndex: number,
  editHandleType: EditHandleType = 'existing'
): EditHandle[] {
  let handles: EditHandle[] = [];

  switch (geometry.type) {
    case 'Point':
      // positions are not nested
      handles = [
        {
          position: geometry.coordinates,
          positionIndexes: [],
          featureIndex,
          type: editHandleType
        }
      ];
      break;
    case 'MultiPoint':
    case 'LineString':
      // positions are nested 1 level
      handles = handles.concat(
        getEditHandlesForCoordinates(geometry.coordinates, [], featureIndex, editHandleType)
      );
      break;
    case 'Polygon':
    case 'MultiLineString':
      // positions are nested 2 levels
      for (let a = 0; a < geometry.coordinates.length; a++) {
        handles = handles.concat(
          getEditHandlesForCoordinates(geometry.coordinates[a], [a], featureIndex, editHandleType)
        );
        if (geometry.type === 'Polygon') {
          // Don't repeat the first/last handle for Polygons
          handles = handles.slice(0, -1);
        }
      }

      break;
    case 'MultiPolygon':
      // positions are nested 3 levels
      for (let a = 0; a < geometry.coordinates.length; a++) {
        for (let b = 0; b < geometry.coordinates[a].length; b++) {
          handles = handles.concat(
            getEditHandlesForCoordinates(
              geometry.coordinates[a][b],
              [a, b],
              featureIndex,
              editHandleType
            )
          );
          // Don't repeat the first/last handle for Polygons
          handles = handles.slice(0, -1);
        }
      }

      break;
    default:
      throw Error(`Unhandled geometry type: ${geometry.type}`);
  }

  return handles;
}

function getEditHandlesForCoordinates(
  coordinates: any[],
  positionIndexPrefix: number[],
  featureIndex: number,
  editHandleType: EditHandleType = 'existing'
): EditHandle[] {
  const editHandles: EditHandle[] = [];
  for (let i = 0; i < coordinates.length; i++) {
    const position = coordinates[i] as Position;
    editHandles.push({
      position,
      positionIndexes: [...positionIndexPrefix, i],
      featureIndex,
      type: editHandleType
    });
  }
  return editHandles;
}
