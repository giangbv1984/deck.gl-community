// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import turfArea from '@turf/area';
import turfCentroid from '@turf/centroid';
import {ClickEvent, Tooltip, ModeProps} from './types';
import {DrawPolygonMode} from './draw-polygon-mode';
import {FeatureCollectionWithSupportedGeometry} from '../utils/types';

const DEFAULT_TOOLTIPS = [];

export class MeasureAreaMode extends DrawPolygonMode {
  handleClick(event: ClickEvent, props: ModeProps<FeatureCollectionWithSupportedGeometry>) {
    const propsWithoutEdit = {
      ...props,
      onEdit: () => {}
    };

    super.handleClick(event, propsWithoutEdit);
  }

  handleKeyUp(
    event: KeyboardEvent,
    props: ModeProps<FeatureCollectionWithSupportedGeometry>
  ): void {
    const propsWithoutEdit = {
      ...props,
      onEdit: () => {}
    };

    super.handleKeyUp(event, propsWithoutEdit);
  }

  getTooltips(props: ModeProps<FeatureCollectionWithSupportedGeometry>): Tooltip[] {
    const tentativeGuide = this.getTentativeGuide(props);

    if (tentativeGuide && tentativeGuide.geometry.type === 'Polygon') {
      const {modeConfig} = props;
      const {formatTooltip, measurementCallback} = modeConfig || {};
      const units = 'sq. m';

      const centroid = turfCentroid(tentativeGuide);
      const area = turfArea(tentativeGuide);

      let text: string;
      if (formatTooltip) {
        text = formatTooltip(area);
      } else {
        // By default, round to 2 decimal places and append units
        // @ts-expect-error are isn't string
        text = `${parseFloat(area).toFixed(2)} ${units}`;
      }

      if (measurementCallback) {
        measurementCallback(area);
      }

      return [
        {
          position: centroid.geometry.coordinates,
          text
        }
      ];
    }
    return DEFAULT_TOOLTIPS;
  }
}
