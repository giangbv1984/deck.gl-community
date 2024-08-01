// deck.gl-community
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {StartDraggingEvent, ModeProps} from './types';
import {TranslateMode} from './translate-mode';
import { FeatureCollectionWithSupportedGeometry } from '../utils/types';

export class DuplicateMode extends TranslateMode {
  handleStartDragging(event: StartDraggingEvent, props: ModeProps<FeatureCollectionWithSupportedGeometry>) {
    super.handleStartDragging(event, props);

    if (this._geometryBeforeTranslate) {
      props.onEdit(this.getAddManyFeaturesAction(this._geometryBeforeTranslate, props.data));
    }
  }

  updateCursor(props: ModeProps<FeatureCollectionWithSupportedGeometry>) {
    if (this._isTranslatable) {
      props.onUpdateCursor('copy');
    } else {
      props.onUpdateCursor(null);
    }
  }
}
