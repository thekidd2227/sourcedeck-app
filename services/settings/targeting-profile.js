// services/settings/targeting-profile.js
//
// User-editable GovCon targeting profile.
//
// Re-exports the implementation that currently lives in
// services/govcon/targeting-profile.js. The settings tier is the
// home for all user-editable platform configuration that future
// web/desktop clients will share.

'use strict';

const impl = require('../govcon/targeting-profile');

module.exports = {
  createTargetingProfileService: impl.createTargetingProfileService,
  defaultProfile:                impl.defaultProfile,
  sanitizeProfile:               impl.sanitizeProfile,
  NOTICE_TYPE_GROUPS:            impl.NOTICE_TYPE_GROUPS,
  KNOWN_SETASIDES:               impl.KNOWN_SETASIDES,
  KNOWN_CONTRACT_TYPES:          impl.KNOWN_CONTRACT_TYPES,
  KNOWN_CERTIFICATIONS:          impl.KNOWN_CERTIFICATIONS
};
